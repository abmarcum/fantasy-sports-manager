from typing import Dict, List, Any
from src.graph_db.driver import db_driver
from src.scrapers.fantasypros_scraper import fantasypros_scraper

class MatchupEngine:
    """League-wide matchup analysis, win probability solver, and manager rivalry history."""

    def analyze_league_matchups(self, scoreboard: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyzes all matchups in a league for a given week with positional radars and difficulty ratings."""
        matchups = scoreboard.get("matchups", [])
        analyzed = []

        # Get defensive difficulty ratings
        qb_fpa = fantasypros_scraper.get_matchup_difficulty_ratings("QB")
        rb_fpa = fantasypros_scraper.get_matchup_difficulty_ratings("RB")
        wr_fpa = fantasypros_scraper.get_matchup_difficulty_ratings("WR")

        for m in matchups:
            t1 = m.get("team1", {})
            t2 = m.get("team2", {})

            t1_proj = t1.get("projected", 100.0)
            t2_proj = t2.get("projected", 100.0)
            total_proj = t1_proj + t2_proj if (t1_proj + t2_proj) > 0 else 200.0

            t1_win_prob = round((t1_proj / total_proj) * 100, 1)
            t2_win_prob = round(100.0 - t1_win_prob, 1)

            # Query historical head-to-head record from graph DB
            h2h_query = """
            MATCH (t1:Team {team_key: $t1_key})-[r:MATCHED_AGAINST]->(t2:Team {team_key: $t2_key})
            RETURN r.outcome AS outcome
            """
            h2h_records = db_driver.execute_query(h2h_query, {
                "t1_key": t1.get("team_key"),
                "t2_key": t2.get("team_key")
            })

            t1_wins = sum(1 for r in h2h_records if r.get("outcome") == "WIN")
            t2_wins = sum(1 for r in h2h_records if r.get("outcome") == "LOSS")

            analyzed.append({
                "week": m.get("week"),
                "is_completed": m.get("is_completed"),
                "winner_team_key": m.get("winner_team_key"),
                "team1": {
                    "team_key": t1.get("team_key"),
                    "name": t1.get("name"),
                    "points": t1.get("points"),
                    "projected": t1.get("projected"),
                    "win_probability": t1_win_prob,
                    "h2h_wins": t1_wins
                },
                "team2": {
                    "team_key": t2.get("team_key"),
                    "name": t2.get("name"),
                    "points": t2.get("points"),
                    "projected": t2.get("projected"),
                    "win_probability": t2_win_prob,
                    "h2h_wins": t2_wins
                },
                "difficulty_ratings": {
                    "QB": qb_fpa,
                    "RB": rb_fpa,
                    "WR": wr_fpa
                }
            })
        return analyzed

matchup_engine = MatchupEngine()
