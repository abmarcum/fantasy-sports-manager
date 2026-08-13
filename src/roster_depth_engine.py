from typing import Dict, List, Any
from src.graph_db.driver import db_driver

class RosterDepthEngine:
    """Positional Power Indexing & Roster Depth Heatmap Engine."""

    POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"]

    def analyze_roster_depth(self, league_key: str, user_team_key: str) -> Dict[str, Any]:
        """
        Calculates position-by-position power scores across all teams in the league
        relative to the league average, highlighting primary team surpluses and deficits.
        """
        # Query all teams
        teams_query = """
        MATCH (t:Team)
        RETURN t.team_key AS team_key, t.name AS name
        """
        teams = db_driver.execute_query(teams_query)
        if not teams:
            return {"positions": self.POSITIONS, "team_scores": {}, "league_averages": {}}

        # Query all rostered / drafted players
        players_query = """
        MATCH (t:Team)-[:DRAFTED|ROSTERED]->(p:Player)
        RETURN t.team_key AS team_key, p.position AS pos, p.adp AS adp
        """
        rostered = db_driver.execute_query(players_query)

        # Calculate positional scores for each team
        # Lower ADP = better player value -> convert to power index 0-100
        team_pos_scores = {t["team_key"]: {p: 50.0 for p in self.POSITIONS} for t in teams}

        for r in rostered:
            t_key = r.get("team_key")
            pos = r.get("pos")
            adp = float(r.get("adp", 150.0) or 150.0)
            if t_key in team_pos_scores and pos in team_pos_scores[t_key]:
                val = max(10.0, 100.0 - (adp * 0.5))
                team_pos_scores[t_key][pos] += val * 0.35

        # Compute league averages per position
        league_averages = {}
        for p in self.POSITIONS:
            all_scores = [team_pos_scores[t["team_key"]][p] for t in teams]
            avg = sum(all_scores) / max(1, len(all_scores))
            league_averages[p] = round(avg, 1)

        # Normalize and find user team's surplus and deficit
        user_scores = team_pos_scores.get(user_team_key, {p: 50.0 for p in self.POSITIONS})
        
        comparison = []
        for p in self.POSITIONS:
            u_score = round(user_scores.get(p, 50.0), 1)
            l_avg = league_averages.get(p, 50.0)
            diff = round(u_score - l_avg, 1)
            grade = "A+" if diff > 15 else ("A" if diff > 5 else ("B" if diff >= -5 else ("C" if diff >= -15 else "D")))

            comparison.append({
                "position": p,
                "user_score": u_score,
                "league_avg": l_avg,
                "difference": diff,
                "grade": grade,
                "status": "💪 Strong Surplus" if diff >= 8 else ("⚠️ Positional Deficit" if diff <= -8 else "⚖️ Par")
            })

        # Identify biggest surplus and deficit
        sorted_diff = sorted(comparison, key=lambda x: x["difference"], reverse=True)
        top_surplus = sorted_diff[0] if sorted_diff else {}
        top_deficit = sorted_diff[-1] if sorted_diff else {}

        return {
            "league_key": league_key,
            "team_key": user_team_key,
            "positions": self.POSITIONS,
            "comparison": comparison,
            "top_surplus": top_surplus,
            "top_deficit": top_deficit,
            "trade_recommendation": f"Your biggest strength is at {top_surplus.get('position', 'WR')} ({top_surplus.get('status')}). Look to trade excess depth here to reinforce your deficit at {top_deficit.get('position', 'RB')}."
        }

roster_depth_engine = RosterDepthEngine()
