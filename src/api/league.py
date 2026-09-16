from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from src.yahoo_client import yahoo_client
from src.graph_db.driver import db_driver

router = APIRouter(prefix="/api/league", tags=["League Sync & Data"])

@router.get("/list")
def get_user_leagues():
    leagues = []
    yahoo_debug = []

    # 1. Fetch any leagues already saved in the local Graph DB
    try:
        db_leagues = db_driver.execute_query("MATCH (l:League) RETURN l.league_key AS league_key, l.name AS name, l.season AS season")
        for dl in db_leagues:
            leagues.append({
                "league_key": dl["league_key"],
                "name": dl.get("name") or dl["league_key"],
                "season": dl.get("season") or "2024"
            })
    except Exception as e:
        print(f"Error querying local Graph DB for leagues: {e}")

    # 2. Query Yahoo API if connected and merge results
    try:
        api_leagues = yahoo_client.get_user_leagues()
        yahoo_debug = getattr(yahoo_client, "last_debug", [])
        existing_keys = {l["league_key"] for l in leagues}
        for al in (api_leagues or []):
            if al.get("league_key") not in existing_keys:
                leagues.append(al)
                existing_keys.add(al.get("league_key"))
    except Exception as e:
        yahoo_debug = getattr(yahoo_client, "last_debug", [])

    return {"leagues": leagues, "debug": yahoo_debug}

@router.get("/teams")
@router.get("/{league_key}/teams")
def get_league_teams(league_key: Optional[str] = None):
    """Returns all teams belonging to the given league from Graph DB, or all teams if fallback."""
    teams = []
    clean_key = (league_key or "").strip()
    try:
        if clean_key and clean_key != "all" and clean_key != "sample":
            query = """
            MATCH (t:Team)-[:BELONGS_TO]->(l:League)
            WHERE l.league_key = $league_key
            RETURN t.team_key AS team_key, t.team_id AS team_id, t.name AS name,
                   t.manager_name AS manager_name, t.logo_url AS logo_url,
                   t.draft_position AS draft_position, t.is_user_team AS is_user_team
            ORDER BY t.name ASC
            """
            teams = db_driver.execute_query(query, {"league_key": clean_key})
        
        # If no teams returned with BELONGS_TO or clean_key is "all" or "sample", query all teams
        if not teams:
            query = """
            MATCH (t:Team)
            RETURN t.team_key AS team_key, t.team_id AS team_id, t.name AS name,
                   t.manager_name AS manager_name, t.logo_url AS logo_url,
                   t.draft_position AS draft_position, t.is_user_team AS is_user_team
            ORDER BY t.name ASC
            """
            teams = db_driver.execute_query(query)
    except Exception as e:
        print(f"Error querying teams for league {league_key}: {e}")
        teams = []

    return {"league_key": league_key, "teams": teams, "total": len(teams)}

@router.post("/sync/{league_key}")
def sync_league(league_key: str):
    """Fetches real Yahoo league teams, settings, players, and draft picks into Kùzu Graph DB."""
    raw_key = league_key.strip()
    league_id = raw_key
    if "/f1/" in raw_key:
        league_id = raw_key.split("/f1/")[-1].split("/")[0].split("?")[0]
    elif ".l." in raw_key:
        league_id = raw_key.split(".l.")[-1]
    
    candidates = []
    if raw_key.startswith("449."):
        candidates.append(raw_key)
    if league_id.isdigit():
        candidates.extend([f"449.l.{league_id}", f"nfl.l.{league_id}", f"423.l.{league_id}", f"414.l.{league_id}"])
    if raw_key not in candidates:
        candidates.append(raw_key)

    # Try resolving candidate keys
    resolved_key = None
    settings_info = None
    teams = []
    attempt_errors = []

    for cand in candidates:
        try:
            settings_info = yahoo_client.get_league_settings(cand)
            teams = yahoo_client.get_league_teams(cand)
            if teams or (settings_info and settings_info.get("name") != "Fantasy League"):
                resolved_key = cand
                break
        except Exception as ex:
            attempt_errors.append(f"Candidate key '{cand}': {str(ex)}")

    if not resolved_key:
        err_report = " | ".join(attempt_errors) if attempt_errors else "Unable to load league settings or teams"
        raise HTTPException(status_code=400, detail=f"League sync error: {err_report}")

    league_key = resolved_key

    try:
        players = yahoo_client.get_available_players(league_key, start=0, count=100)
        draft_picks = yahoo_client.get_draft_results(league_key)

        # 1. Ingest League Node
        db_driver.execute_write("""
        MERGE (l:League {league_key: $league_key})
        ON CREATE SET l.name = $name, l.season = $season, l.num_teams = $num_teams, l.scoring_type = $scoring_type
        ON MATCH SET l.name = $name, l.season = $season, l.num_teams = $num_teams, l.scoring_type = $scoring_type
        """, {
            "league_key": league_key,
            "name": settings_info.get("name", "Fantasy League"),
            "season": "2024",
            "num_teams": int(settings_info.get("num_teams", len(teams) or 10)),
            "scoring_type": settings_info.get("scoring_type", "headhead")
        })

        # 2. Ingest Team Nodes & BELONGS_TO Relationships
        for t in teams:
            db_driver.execute_write("""
            MERGE (tm:Team {team_key: $team_key})
            ON CREATE SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
                tm.logo_url = $logo_url, tm.draft_position = $draft_position, tm.is_user_team = $is_user_team
            ON MATCH SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
                tm.logo_url = $logo_url, tm.draft_position = $draft_position, tm.is_user_team = $is_user_team
            """, {
                "team_key": t.get("team_key"),
                "team_id": str(t.get("team_id")),
                "name": t.get("name"),
                "manager_name": t.get("manager_name"),
                "logo_url": t.get("logo_url", ""),
                "draft_position": int(t.get("draft_position", 1)),
                "is_user_team": bool(t.get("is_user_team", False))
            })

            db_driver.execute_write("""
            MATCH (tm:Team), (l:League)
            WHERE tm.team_key = $team_key AND l.league_key = $league_key
            CREATE (tm)-[:BELONGS_TO]->(l)
            """, {
                "team_key": t.get("team_key"),
                "league_key": league_key
            })

        # 3. Ingest Player Nodes
        for p in players:
            db_driver.execute_write("""
            MERGE (pl:Player {player_key: $player_key})
            ON CREATE SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
                pl.nfl_team = $nfl_team, pl.headshot_url = $headshot_url, pl.bye_week = $bye_week,
                pl.adp = $adp, pl.status = $status
            ON MATCH SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
                pl.nfl_team = $nfl_team, pl.headshot_url = $headshot_url, pl.bye_week = $bye_week,
                pl.adp = $adp, pl.status = $status
            """, {
                "player_key": p.get("player_key"),
                "player_id": str(p.get("player_id")),
                "name": p.get("name"),
                "position": p.get("position"),
                "nfl_team": p.get("nfl_team"),
                "headshot_url": p.get("headshot_url", ""),
                "bye_week": str(p.get("bye_week", "0")),
                "adp": 99.0,
                "status": p.get("status", "Active")
            })

        # 4. Ingest Draft Pick Relationships
        for dp in draft_picks:
            db_driver.execute_write("""
            MATCH (tm:Team), (pl:Player)
            WHERE tm.team_key = $team_key AND pl.player_key = $player_key
            CREATE (tm)-[:DRAFTED {pick_num: $pick_num, round: $round_num, cost: $cost}]->(pl)
            """, {
                "team_key": dp.get("team_key"),
                "player_key": dp.get("player_key"),
                "pick_num": int(dp.get("pick", 0)),
                "round_num": int(dp.get("round", 0)),
                "cost": int(dp.get("cost", 0))
            })

        return {
            "status": "success",
            "league_key": league_key,
            "message": f"Successfully ingested league '{league_key}' into Graph DB.",
            "counts": {
                "teams": len(teams),
                "players": len(players),
                "draft_picks": len(draft_picks)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"League sync error: {str(e)}")

@router.post("/sample")
def load_sample_league():
    """Generates a complete 10-team sample fantasy league with rosters and draft picks for instant testing."""
    sample_key = "demo.l.1001"
    sample_teams = [
        {"team_key": "demo.l.1001.t.1", "team_id": "1", "name": "Gridiron Gladiators", "manager": "Commissioner Alex", "is_user": True},
        {"team_key": "demo.l.1001.t.2", "team_id": "2", "name": "Turbo Chargers", "manager": "Sarah J.", "is_user": False},
        {"team_key": "demo.l.1001.t.3", "team_id": "3", "name": "Mahomes Magic", "manager": "Dave K.", "is_user": False},
        {"team_key": "demo.l.1001.t.4", "team_id": "4", "name": "Touchdown Titans", "manager": "Mike R.", "is_user": False},
        {"team_key": "demo.l.1001.t.5", "team_id": "5", "name": "Blitzkrieg Bop", "manager": "Chris T.", "is_user": False},
        {"team_key": "demo.l.1001.t.6", "team_id": "6", "name": "Endzone Enforcers", "manager": "Taylor W.", "is_user": False},
        {"team_key": "demo.l.1001.t.7", "team_id": "7", "name": "Waiver Wire Kings", "manager": "Jordan P.", "is_user": False},
        {"team_key": "demo.l.1001.t.8", "team_id": "8", "name": "Fourth & Inches", "manager": "Sam H.", "is_user": False},
        {"team_key": "demo.l.1001.t.9", "team_id": "9", "name": "Hail Mary Heroes", "manager": "Morgan B.", "is_user": False},
        {"team_key": "demo.l.1001.t.10", "team_id": "10", "name": "Red Zone Rockets", "manager": "Casey M.", "is_user": False}
    ]

    sample_players = [
        {"key": "nfl.p.31002", "id": "31002", "name": "Patrick Mahomes", "pos": "QB", "nfl": "KC", "bye": "6", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/31002.png"},
        {"key": "nfl.p.30123", "id": "30123", "name": "Christian McCaffrey", "pos": "RB", "nfl": "SF", "bye": "9", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/30123.png"},
        {"key": "nfl.p.31838", "id": "31838", "name": "CeeDee Lamb", "pos": "WR", "nfl": "DAL", "bye": "7", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/31838.png"},
        {"key": "nfl.p.32675", "id": "32675", "name": "Justin Jefferson", "pos": "WR", "nfl": "MIN", "bye": "6", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/32675.png"},
        {"key": "nfl.p.31001", "id": "31001", "name": "Travis Kelce", "pos": "TE", "nfl": "KC", "bye": "6", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/31001.png"},
        {"key": "nfl.p.29235", "id": "29235", "name": "Tyreek Hill", "pos": "WR", "nfl": "MIA", "bye": "6", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/29235.png"},
        {"key": "nfl.p.31833", "id": "31833", "name": "Lamar Jackson", "pos": "QB", "nfl": "BAL", "bye": "14", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/31833.png"},
        {"key": "nfl.p.33958", "id": "33958", "name": "Breece Hall", "pos": "RB", "nfl": "NYJ", "bye": "12", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/33958.png"},
        {"key": "nfl.p.33393", "id": "33393", "name": "Amon-Ra St. Brown", "pos": "WR", "nfl": "DET", "bye": "5", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/33393.png"},
        {"key": "nfl.p.29238", "id": "29238", "name": "Derrick Henry", "pos": "RB", "nfl": "BAL", "bye": "14", "headshot": "https://s.yimg.com/it/u/headshots/nfl/players/82x82/29238.png"}
    ]

    try:
        # Ingest League
        db_driver.execute_write("""
        MERGE (l:League {league_key: $league_key})
        ON CREATE SET l.name = $name, l.season = $season, l.num_teams = $num_teams, l.scoring_type = $scoring_type
        ON MATCH SET l.name = $name, l.season = $season, l.num_teams = $num_teams, l.scoring_type = $scoring_type
        """, {
            "league_key": sample_key,
            "name": "Demo Championship League",
            "season": "2024",
            "num_teams": 10,
            "scoring_type": "headhead"
        })

        # Ingest Teams
        for i, t in enumerate(sample_teams):
            db_driver.execute_write("""
            MERGE (tm:Team {team_key: $team_key})
            ON CREATE SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
                tm.logo_url = $logo_url, tm.draft_position = $draft_position, tm.is_user_team = $is_user_team
            ON MATCH SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
                tm.logo_url = $logo_url, tm.draft_position = $draft_position, tm.is_user_team = $is_user_team
            """, {
                "team_key": t["team_key"],
                "team_id": t["team_id"],
                "name": t["name"],
                "manager_name": t["manager"],
                "logo_url": f"https://picsum.photos/seed/{t['team_id']}/100/100",
                "draft_position": i + 1,
                "is_user_team": t["is_user"]
            })

            db_driver.execute_write("""
            MATCH (tm:Team), (l:League)
            WHERE tm.team_key = $team_key AND l.league_key = $league_key
            CREATE (tm)-[:BELONGS_TO]->(l)
            """, {"team_key": t["team_key"], "league_key": sample_key})

        # Ingest Players & Draft Picks
        for idx, p in enumerate(sample_players):
            db_driver.execute_write("""
            MERGE (pl:Player {player_key: $player_key})
            ON CREATE SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
                pl.nfl_team = $nfl_team, pl.headshot_url = $headshot_url, pl.bye_week = $bye_week,
                pl.adp = $adp, pl.status = 'Active'
            ON MATCH SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
                pl.nfl_team = $nfl_team, pl.headshot_url = $headshot_url, pl.bye_week = $bye_week,
                pl.adp = $adp, pl.status = 'Active'
            """, {
                "player_key": p["key"],
                "player_id": p["id"],
                "name": p["name"],
                "position": p["pos"],
                "nfl_team": p["nfl"],
                "headshot_url": p["headshot"],
                "bye_week": p["bye"],
                "adp": float(idx + 1)
            })

            # Assign 1st round pick to team
            team_key = sample_teams[idx % len(sample_teams)]["team_key"]
            db_driver.execute_write("""
            MATCH (tm:Team), (pl:Player)
            WHERE tm.team_key = $team_key AND pl.player_key = $player_key
            CREATE (tm)-[:DRAFTED {pick_num: $pick_num, round: 1, cost: 0}]->(pl)
            """, {
                "team_key": team_key,
                "player_key": p["key"],
                "pick_num": idx + 1
            })

        return {
            "status": "success",
            "league_key": sample_key,
            "name": "Demo Championship League",
            "message": "Successfully initialized Demo Championship League with 10 teams and NFL stars!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sample league error: {str(e)}")

class ScrapePayload(BaseModel):
    league_id: str
    cookie: Optional[str] = None

class HtmlScrapePayload(BaseModel):
    league_id: str
    html: str

@router.post("/scrape")
def scrape_yahoo_league(payload: ScrapePayload):
    """Scrapes Yahoo Fantasy Football league using optional browser session cookies without requiring developer API approval."""
    from src.scrapers.yahoo_scraper import YahooWebScraper

    clean_id = payload.league_id.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="League ID cannot be empty.")

    try:
        scraper = YahooWebScraper(cookie=payload.cookie)
        scraped_data = scraper.scrape_full_league(clean_id)
        result = scraper.ingest_scraped_data(scraped_data)
        return result
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraper error: {str(e)}")

@router.post("/scrape-html")
def import_yahoo_html(payload: HtmlScrapePayload):
    """Imports Yahoo league standings and teams directly from pasted page HTML source."""
    from src.scrapers.yahoo_scraper import YahooWebScraper

    clean_id = payload.league_id.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="League ID cannot be empty.")
    if not payload.html or len(payload.html.strip()) < 50:
        raise HTTPException(status_code=400, detail="HTML content is too short or empty. Please paste the full page source.")

    try:
        scraper = YahooWebScraper()
        scraped_data = scraper.parse_league_standings_html(payload.html, clean_id)
        result = scraper.ingest_scraped_data(scraped_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HTML import error: {str(e)}")

