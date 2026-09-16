from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from src.yahoo_client import yahoo_client
from src.graph_db.driver import db_driver

router = APIRouter(prefix="/api/league", tags=["League Sync & Data"])

@router.get("/list")
def get_user_leagues():
    try:
        leagues = yahoo_client.get_user_leagues()
        return {"leagues": leagues, "debug": getattr(yahoo_client, "last_debug", [])}
    except Exception as e:
        # Fallback empty list if unauthenticated or error
        return {"leagues": [], "error": str(e), "debug": getattr(yahoo_client, "last_debug", [])}

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
        SET l.name = $name, l.season = $season, l.num_teams = $num_teams, l.scoring_type = $scoring_type
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
            SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
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
            MATCH (tm:Team {team_key: $team_key}), (l:League {league_key: $league_key})
            CREATE (tm)-[:BELONGS_TO]->(l)
            """, {
                "team_key": t.get("team_key"),
                "league_key": league_key
            })

        # 3. Ingest Player Nodes
        for p in players:
            db_driver.execute_write("""
            MERGE (pl:Player {player_key: $player_key})
            SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
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
            MATCH (tm:Team {team_key: $team_key}), (pl:Player {player_key: $player_key})
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
        SET l.name = $name, l.season = $season, l.num_teams = $num_teams, l.scoring_type = $scoring_type
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
            SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
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
            MATCH (tm:Team {team_key: $team_key}), (l:League {league_key: $league_key})
            CREATE (tm)-[:BELONGS_TO]->(l)
            """, {"team_key": t["team_key"], "league_key": sample_key})

        # Ingest Players & Draft Picks
        for idx, p in enumerate(sample_players):
            db_driver.execute_write("""
            MERGE (pl:Player {player_key: $player_key})
            SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
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
            MATCH (tm:Team {team_key: $team_key}), (pl:Player {player_key: $player_key})
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
