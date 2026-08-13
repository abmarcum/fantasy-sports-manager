from typing import Dict, List, Any
from src.graph_db.driver import db_driver

class HandcuffEngine:
    """Graph-powered NFL Depth Chart Handcuff Mapping & Roster Insurance Risk Engine."""

    # Curated depth chart primary-to-backup RB & WR mappings
    HANDCUFF_PAIRS = {
        "SF": {"starter": "Christian McCaffrey", "handcuff": "Jordan Mason", "pos": "RB"},
        "BAL": {"starter": "Derrick Henry", "handcuff": "Justice Hill", "pos": "RB"},
        "DET": {"starter": "Jahmyr Gibbs", "handcuff": "David Montgomery", "pos": "RB"},
        "MIA": {"starter": "De'Von Achane", "handcuff": "Raheem Mostert", "pos": "RB"},
        "LAR": {"starter": "Kyren Williams", "handcuff": "Blake Corum", "pos": "RB"},
        "PHI": {"starter": "Saquon Barkley", "handcuff": "Kenneth Gainwell", "pos": "RB"},
        "BUF": {"starter": "James Cook", "handcuff": "Ray Davis", "pos": "RB"},
        "GB": {"starter": "Josh Jacobs", "handcuff": "Emanuel Wilson", "pos": "RB"},
        "NYJ": {"starter": "Breece Hall", "handcuff": "Braelon Allen", "pos": "RB"},
        "ATL": {"starter": "Bijan Robinson", "handcuff": "Tyler Allgeier", "pos": "RB"},
        "CIN": {"starter": "Chase Brown", "handcuff": "Zack Moss", "pos": "RB"},
        "ARI": {"starter": "James Conner", "handcuff": "Trey Benson", "pos": "RB"},
        "DAL": {"starter": "CeeDee Lamb", "handcuff": "Jalen Tolbert", "pos": "WR"},
        "MIN": {"starter": "Justin Jefferson", "handcuff": "Jordan Addison", "pos": "WR"},
        "KC": {"starter": "Isiah Pacheco", "handcuff": "Kareem Hunt", "pos": "RB"}
    }

    def analyze_handcuff_matrix(self, league_key: str, user_team_key: str) -> Dict[str, Any]:
        """
        Analyzes starting running backs & receivers on user's roster,
        checks if backup handcuffs are secured, on rival rosters, or free agents on waivers.
        """
        # Query user team roster
        user_query = """
        MATCH (t:Team {team_key: $team_key})-[:DRAFTED|ROSTERED]->(p:Player)
        RETURN p.player_key AS player_key, p.name AS name, p.position AS position, p.nfl_team AS nfl_team
        """
        user_roster = db_driver.execute_query(user_query, {"team_key": user_team_key})

        # Query all rostered players across league to find where handcuffs reside
        all_rosters_query = """
        MATCH (t:Team)-[:DRAFTED|ROSTERED]->(p:Player)
        RETURN t.team_key AS team_key, t.name AS team_name, p.name AS player_name
        """
        all_rostered = db_driver.execute_query(all_rosters_query)
        rostered_map = {r["player_name"]: r["team_name"] for r in all_rostered}

        matrix = []
        insured_count = 0
        total_starters_evaluated = 0

        user_player_names = {p["name"]: p for p in user_roster}

        for team_abbr, pair in self.HANDCUFF_PAIRS.items():
            starter_name = pair["starter"]
            handcuff_name = pair["handcuff"]
            pos = pair["pos"]

            # Check if user owns the starter
            if starter_name in user_player_names:
                total_starters_evaluated += 1
                
                # Check where handcuff is located
                if handcuff_name in user_player_names:
                    status = "🛡️ INSURED"
                    status_class = "insured"
                    location = "On Your Bench"
                    action_tip = "You have full insurance coverage for this backfield."
                    insured_count += 1
                elif handcuff_name in rostered_map:
                    rival_team = rostered_map[handcuff_name]
                    status = "⚠️ HELD HOSTAGE"
                    status_class = "hostage"
                    location = f"Rostered by {rival_team}"
                    action_tip = f"Consider trading with {rival_team} to secure your insurance."
                else:
                    status = "🚨 EXPOSED (ON WAIVERS)"
                    status_class = "exposed"
                    location = "Available on Waivers"
                    action_tip = f"Add {handcuff_name} immediately off waivers to protect your starting investment!"

                matrix.append({
                    "nfl_team": team_abbr,
                    "position": pos,
                    "starter_name": starter_name,
                    "handcuff_name": handcuff_name,
                    "status": status,
                    "status_class": status_class,
                    "location": location,
                    "action_tip": action_tip
                })

        coverage_score = round((insured_count / max(1, total_starters_evaluated)) * 100, 0)

        return {
            "league_key": league_key,
            "team_key": user_team_key,
            "coverage_percentage": int(coverage_score),
            "total_starters_evaluated": total_starters_evaluated,
            "insured_count": insured_count,
            "matrix": matrix
        }

handcuff_engine = HandcuffEngine()
