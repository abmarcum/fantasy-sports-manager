from fastapi import APIRouter, Query, HTTPException
from src.scrapers.sleeper_client import sleeper_client
from src.graph_db.driver import db_driver

router = APIRouter(prefix="/api/sleeper", tags=["Sleeper Multi-Platform Ingestion"])

@router.get("/user-leagues")
def get_sleeper_user_leagues(username: str = Query(...), season: str = Query("2024")):
    """Fetches all leagues for a Sleeper username without requiring OAuth passwords."""
    user = sleeper_client.get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail=f"Sleeper username '{username}' not found.")

    leagues = sleeper_client.get_user_leagues(user["user_id"], season=season)
    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "display_name": user.get("display_name", username),
        "leagues": [
            {
                "league_id": l["league_id"],
                "name": l["name"],
                "season": l["season"],
                "total_rosters": l.get("total_rosters", 12),
                "status": l.get("status", "in_season")
            }
            for l in leagues
        ]
    }

@router.post("/sync/{league_id}")
def sync_sleeper_league(league_id: str):
    """Ingests Sleeper league teams and rosters directly into the graph database."""
    league_info = sleeper_client.get_league(league_id)
    if not league_info:
        raise HTTPException(status_code=404, detail="Sleeper league not found.")

    users = sleeper_client.get_league_users(league_id)
    rosters = sleeper_client.get_league_rosters(league_id)

    user_map = {u["user_id"]: u.get("display_name", u.get("username", "Manager")) for u in users}

    # Store League node
    db_driver.execute_write(
        """
        MERGE (l:League {league_key: $league_key})
        SET l.name = $name, l.season = $season, l.num_teams = $num_teams, l.scoring_type = 'sleeper'
        """,
        {
            "league_key": f"sleeper_{league_id}",
            "name": league_info.get("name", "Sleeper League"),
            "season": league_info.get("season", "2024"),
            "num_teams": int(league_info.get("total_rosters", len(rosters)))
        }
    )

    # Ingest Teams & Rosters
    for r in rosters:
        owner_id = r.get("owner_id", "")
        manager_name = user_map.get(owner_id, f"Manager {r.get('roster_id')}")
        team_key = f"sleeper_{league_id}.t.{r.get('roster_id')}"
        team_name = f"{manager_name}'s Team"

        db_driver.execute_write(
            """
            MERGE (t:Team {team_key: $team_key})
            SET t.name = $name, t.manager_name = $manager, t.is_user_team = false
            WITH t
            MATCH (l:League {league_key: $league_key})
            MERGE (t)-[:BELONGS_TO]->(l)
            """,
            {
                "team_key": team_key,
                "name": team_name,
                "manager": manager_name,
                "league_key": f"sleeper_{league_id}"
            }
        )

    return {
        "status": "success",
        "message": f"Successfully ingested Sleeper league '{league_info.get('name')}' ({len(rosters)} teams) into Graph DB!",
        "league_key": f"sleeper_{league_id}"
    }
