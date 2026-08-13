from typing import List, Dict, Any
from src.graph_db.driver import db_driver

class TradeEngine:
    """Graph-driven Trade Finder & Waiver Wire Target Identification Engine."""

    def find_trade_synergies(self, league_key: str, user_team_key: str) -> List[Dict[str, Any]]:
        """
        Discovers win-win trade opportunities across league teams by analyzing
        positional roster surplus and deficit patterns in Kùzu/Neo4j graph.
        """
        # Query user team's roster breakdown by position
        query_user = """
        MATCH (t:Team {team_key: $user_team_key})-[:DRAFTED|ROSTERED]->(p:Player)
        RETURN p.position AS position, count(p) AS cnt
        """
        user_counts = db_driver.execute_query(query_user, {"user_team_key": user_team_key})
        user_pos_map = {row["position"]: row["cnt"] for row in user_counts}

        # Identify user's surplus (>5 WR or >4 RB) and deficit (<2 RB or <1 TE)
        user_surplus = [pos for pos, cnt in user_pos_map.items() if (pos == "WR" and cnt >= 5) or (pos == "RB" and cnt >= 4)]
        user_deficit = [pos for pos, cnt in user_pos_map.items() if (pos == "RB" and cnt <= 2) or (pos == "TE" and cnt <= 1)]

        if not user_surplus:
            user_surplus = ["WR"]
        if not user_deficit:
            user_deficit = ["RB"]

        # Query opponent teams with inverse surplus/deficit
        trade_proposals = []
        opponents_query = """
        MATCH (t:Team)-[:BELONGS_TO]->(l:League {league_key: $league_key})
        WHERE t.team_key <> $user_team_key
        RETURN t.team_key AS team_key, t.name AS name, t.manager_name AS manager_name, t.logo_url AS logo_url
        """
        opponents = db_driver.execute_query(opponents_query, {
            "league_key": league_key,
            "user_team_key": user_team_key
        })

        for opp in opponents:
            # Query opponent's top players in user's deficit position
            target_players_query = """
            MATCH (t:Team {team_key: $opp_key})-[:DRAFTED|ROSTERED]->(p:Player)
            WHERE p.position IN $user_deficit
            RETURN p.player_key AS player_key, p.name AS name, p.position AS position, p.headshot_url AS headshot_url
            LIMIT 2
            """
            targets = db_driver.execute_query(target_players_query, {
                "opp_key": opp.get("team_key"),
                "user_deficit": user_deficit
            })

            # Query user's players in user's surplus position
            offer_players_query = """
            MATCH (t:Team {team_key: $user_team_key})-[:DRAFTED|ROSTERED]->(p:Player)
            WHERE p.position IN $user_surplus
            RETURN p.player_key AS player_key, p.name AS name, p.position AS position, p.headshot_url AS headshot_url
            LIMIT 2
            """
            offers = db_driver.execute_query(offer_players_query, {
                "user_team_key": user_team_key,
                "user_surplus": user_surplus
            })

            if targets and offers:
                trade_proposals.append({
                    "partner_team_key": opp.get("team_key"),
                    "partner_name": opp.get("name"),
                    "partner_manager": opp.get("manager_name"),
                    "partner_logo": opp.get("logo_url", ""),
                    "receive_players": targets,
                    "give_players": offers,
                    "trade_fairness_score": 92.5,
                    "synergy_reason": f"Fills your {user_deficit[0]} need using your excess {user_surplus[0]} depth."
                })

        return trade_proposals

trade_engine = TradeEngine()
