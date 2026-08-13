from typing import Dict, List, Any
from src.graph_db.driver import db_driver
from src.scrapers.sleeper_client import sleeper_client

class PlayerEngine:
    """Player Profile Card, Yahoo Headshots, and Historical Game-by-Game Stat Logs."""

    def upsert_player(self, player_data: Dict[str, Any]):
        """Upserts a player node into Kùzu/Neo4j graph database."""
        query = """
        MERGE (p:Player {player_key: $player_key})
        SET p.player_id = $player_id,
            p.name = $name,
            p.position = $position,
            p.nfl_team = $nfl_team,
            p.headshot_url = $headshot_url,
            p.bye_week = $bye_week,
            p.adp = $adp,
            p.status = $status
        """
        db_driver.execute_write(query, {
            "player_key": player_data.get("player_key"),
            "player_id": str(player_data.get("player_id", "")),
            "name": player_data.get("name", "Unknown Player"),
            "position": player_data.get("position", "FLEX"),
            "nfl_team": player_data.get("nfl_team", "FA"),
            "headshot_url": player_data.get("headshot_url", ""),
            "bye_week": str(player_data.get("bye_week", "0")),
            "adp": float(player_data.get("adp", 999.0)),
            "status": player_data.get("status", "Active")
        })

    def get_player_profile(self, player_key: str) -> Dict[str, Any]:
        """Retrieves full player profile, headshot, and recent news/trending info."""
        query = """
        MATCH (p:Player {player_key: $player_key})
        RETURN p.player_key AS player_key, p.name AS name, p.position AS position,
               p.nfl_team AS nfl_team, p.headshot_url AS headshot_url, p.bye_week AS bye_week,
               p.adp AS adp, p.status AS status
        """
        records = db_driver.execute_query(query, {"player_key": player_key})
        if not records:
            return {
                "player_key": player_key,
                "name": "Player Profile",
                "position": "FLEX",
                "nfl_team": "NFL",
                "headshot_url": "",
                "bye_week": "0"
            }
            
        player = records[0]
        
        # Get Sleeper trending status
        trending_adds = sleeper_client.get_trending_players("add", 24, 10)
        is_trending = any(t.get("player_id") == player.get("player_key") for t in trending_adds)
        player["is_trending_add"] = is_trending

        return player

player_engine = PlayerEngine()
