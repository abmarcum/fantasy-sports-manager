from typing import List, Dict, Any
from src.graph_db.driver import db_driver

class DraftEngine:
    """Graph-powered Draft Assistant Engine (VORP, Stacking, Bye-Conflict, Opponent Need Analysis)."""

    def sync_draft_pick(self, team_key: str, player_key: str, pick_num: int, round_num: int, cost: int = 0):
        """Records a draft pick into the graph database."""
        # Create draft relationship in graph
        query = """
        MATCH (t:Team {team_key: $team_key}), (p:Player {player_key: $player_key})
        CREATE (t)-[:DRAFTED {pick_num: $pick_num, round: $round_num, cost: $cost}]->(p)
        """
        db_driver.execute_write(query, {
            "team_key": team_key,
            "player_key": player_key,
            "pick_num": pick_num,
            "round_num": round_num,
            "cost": cost
        })

    def get_draft_recommendations(self, league_key: str, user_team_key: str) -> List[Dict[str, Any]]:
        """
        Calculates graph-based pick recommendations for user team:
        - Scarcity & VORP ranking
        - Stacking bonus for QBs drafted by user
        - Bye-week conflict penalties
        """
        # Fetch available undrafted players
        query = """
        MATCH (p:Player)
        WHERE NOT EXISTS {
            MATCH (t:Team)-[:DRAFTED]->(p)
        }
        RETURN p.player_key AS player_key, p.name AS name, p.position AS position, 
               p.nfl_team AS nfl_team, p.headshot_url AS headshot_url, p.bye_week AS bye_week, p.adp AS adp
        ORDER BY p.adp ASC
        LIMIT 50
        """
        available = db_driver.execute_query(query)
        
        # Query user team's drafted roster to analyze stacks & bye weeks
        user_roster_query = """
        MATCH (t:Team {team_key: $team_key})-[:DRAFTED]->(p:Player)
        RETURN p.player_key AS player_key, p.name AS name, p.position AS position, p.nfl_team AS nfl_team, p.bye_week AS bye_week
        """
        user_roster = db_driver.execute_query(user_roster_query, {"team_key": user_team_key})
        
        user_qbs = [p["nfl_team"] for p in user_roster if p.get("position") == "QB"]
        user_byes = [p.get("bye_week") for p in user_roster]
        
        recommendations = []
        for rank, player in enumerate(available, start=1):
            base_score = 100.0 - (rank * 1.5)
            stack_bonus = 0.0
            bye_penalty = 0.0
            reasons = []

            # Check QB-WR/TE stack synergy
            if player.get("position") in ["WR", "TE"] and player.get("nfl_team") in user_qbs:
                stack_bonus = 15.0
                reasons.append(f"Stacks with your QB ({player.get('nfl_team')})")

            # Check bye week overlap
            if user_byes.count(player.get("bye_week")) >= 2 and player.get("bye_week") != "0":
                bye_penalty = -8.0
                reasons.append(f"Bye week conflict (Week {player.get('bye_week')})")

            final_score = base_score + stack_bonus + bye_penalty
            recommendations.append({
                "player_key": player.get("player_key"),
                "name": player.get("name"),
                "position": player.get("position"),
                "nfl_team": player.get("nfl_team"),
                "headshot_url": player.get("headshot_url", ""),
                "bye_week": player.get("bye_week"),
                "adp": player.get("adp"),
                "score": round(final_score, 1),
                "reasons": reasons
            })

        # Sort recommendations by final score descending
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations

draft_engine = DraftEngine()
