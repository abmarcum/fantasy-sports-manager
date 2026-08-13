from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from src.yahoo_client import yahoo_client
from src.graph_db.driver import db_driver

router = APIRouter(prefix="/api/league", tags=["League Sync & Data"])

@router.get("/list")
def get_user_leagues():
    try:
        leagues = yahoo_client.get_user_leagues()
        return {"leagues": leagues}
    except Exception as e:
        # Fallback empty list if unauthenticated or error
        return {"leagues": [], "error": str(e)}

@router.post("/sync/{league_key}")
def sync_league(league_key: str):
    """Fetches real Yahoo league teams, settings, players, and draft picks into Kùzu Graph DB."""
    try:
        settings_info = yahoo_client.get_league_settings(league_key)
        teams = yahoo_client.get_league_teams(league_key)
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
            "message": f"Successfully ingested league '{league_key}' into Graph DB.",
            "counts": {
                "teams": len(teams),
                "players": len(players),
                "draft_picks": len(draft_picks)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"League sync error: {str(e)}")
