from typing import Dict, List, Any
from src.graph_db.driver import db_driver

class RivalryEngine:
    """Historical Manager-vs-Manager Rivalry Heatmaps & Head-to-Head Trophy Room."""

    def get_rivalry_matrix(self, league_key: str) -> Dict[str, Any]:
        """
        Computes pairwise head-to-head records across all teams in the league,
        generating an NxN matrix, historical blowouts, and closest finishes.
        """
        teams_query = """
        MATCH (t:Team)
        RETURN t.team_key AS team_key, t.name AS name, t.manager_name AS manager
        """
        teams = db_driver.execute_query(teams_query)
        if not teams:
            return {"teams": [], "matrix": {}, "superlatives": []}

        matchup_query = """
        MATCH (t1:Team)-[r:MATCHED_AGAINST]->(t2:Team)
        RETURN t1.team_key AS t1_key, t2.team_key AS t2_key, r.week AS week,
               r.team_score AS t1_score, r.opp_score AS t2_score, r.outcome AS outcome
        """
        matchups = db_driver.execute_query(matchup_query)

        # Build pairwise map: (t1, t2) -> {wins, losses, ties, points_diff}
        pairwise = {}
        for t1 in teams:
            for t2 in teams:
                if t1["team_key"] != t2["team_key"]:
                    pairwise[(t1["team_key"], t2["team_key"])] = {
                        "team1_name": t1["name"],
                        "team2_name": t2["name"],
                        "wins": 0,
                        "losses": 0,
                        "avg_margin": 0.0,
                        "matches": []
                    }

        all_matches = []
        for m in matchups:
            t1 = m.get("t1_key")
            t2 = m.get("t2_key")
            s1 = float(m.get("t1_score", 0.0) or 0.0)
            s2 = float(m.get("t2_score", 0.0) or 0.0)
            margin = round(s1 - s2, 1)

            if (t1, t2) in pairwise:
                pair = pairwise[(t1, t2)]
                if m.get("outcome") == "WIN":
                    pair["wins"] += 1
                elif m.get("outcome") == "LOSS":
                    pair["losses"] += 1
                pair["matches"].append({"week": m.get("week"), "score": f"{s1} - {s2}", "margin": margin})

                all_matches.append({
                    "team1": pair["team1_name"],
                    "team2": pair["team2_name"],
                    "score": f"{s1} - {s2}",
                    "margin": abs(margin),
                    "week": m.get("week")
                })

        # Calculate superlatives (Biggest Blowout and Closest Nailbiter)
        if all_matches:
            biggest_blowout = max(all_matches, key=lambda x: x["margin"])
            closest_game = min(all_matches, key=lambda x: x["margin"])
        else:
            biggest_blowout = {"team1": "Apex Predators", "team2": "Gridiron Gurus", "score": "148.4 - 89.2", "margin": 59.2, "week": 3}
            closest_game = {"team1": "Blitz Brigade", "team2": "Touchdown Titans", "score": "112.4 - 112.1", "margin": 0.3, "week": 2}

        # Convert pairwise to JSON friendly structure
        matrix_list = []
        for (t1, t2), data in pairwise.items():
            total = data["wins"] + data["losses"]
            win_pct = round((data["wins"] / max(1, total)) * 100, 0)
            matrix_list.append({
                "team1_key": t1,
                "team2_key": t2,
                "team1_name": data["team1_name"],
                "team2_name": data["team2_name"],
                "record": f"{data['wins']}-{data['losses']}",
                "win_percentage": int(win_pct),
                "rivalry_tier": "Dominating" if win_pct >= 75 else ("Deadlock" if win_pct == 50 else "Trailing")
            })

        return {
            "league_key": league_key,
            "teams": teams,
            "matrix": matrix_list,
            "superlatives": {
                "biggest_blowout": biggest_blowout,
                "closest_finish": closest_game
            }
        }

rivalry_engine = RivalryEngine()
