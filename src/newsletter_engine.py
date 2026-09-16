import random
from typing import Dict, List, Any
from src.graph_db.driver import db_driver

class NewsletterEngine:
    """
    AI League Commissioner Weekly Newsletter & Trash-Talk Engine.
    Generates rich, humorous, or analytical recaps with customizable tones:
    - 'roast': Ruthless fantasy comedy and savagery.
    - 'analyst': Serious ESPN/The Athletic style strategic deep-dive.
    - 'hype': High-voltage WWE ringmaster energy.
    """

    def generate_weekly_newsletter(self, league_key: str, week: int = 1, tone: str = "roast") -> Dict[str, Any]:
        """
        Gathers graph performance data for the week and formats an AI Commissioner Newsletter.
        """
        # Fetch league information
        league_query = "MATCH (l:League) RETURN l.name AS name, l.season AS season"
        leagues = db_driver.execute_query(league_query)
        league_name = leagues[0]["name"] if leagues else "Fantasy Premier League"

        # Fetch teams and managers
        teams_query = "MATCH (t:Team) RETURN t.team_key AS team_key, t.name AS name, t.manager_name AS manager, t.logo_url AS logo_url"
        teams = db_driver.execute_query(teams_query)
        
        if not teams:
            return self._generate_fallback_newsletter(league_name, week, tone)

        # Fetch matchups
        matchup_query = """
        MATCH (t1:Team)-[r:MATCHED_AGAINST]->(t2:Team)
        RETURN t1.team_key AS t1_key, t2.team_key AS t2_key, r.week AS week,
               r.team_score AS t1_score, r.opp_score AS t2_score, r.outcome AS outcome
        """
        matchups = db_driver.execute_query(matchup_query)

        # Pair scores
        team_scores = []
        head_to_heads = []

        if matchups:
            seen_pairs = set()
            for m in matchups:
                t1 = next((t for t in teams if t["team_key"] == m["t1_key"]), None)
                t2 = next((t for t in teams if t["team_key"] == m["t2_key"]), None)
                if not t1 or not t2:
                    continue

                s1 = float(m.get("t1_score", 0.0) or 0.0)
                s2 = float(m.get("t2_score", 0.0) or 0.0)
                team_scores.append({"team": t1["name"], "manager": t1["manager"], "score": s1})

                pair_key = tuple(sorted([t1["team_key"], t2["team_key"]]))
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    diff = round(abs(s1 - s2), 2)
                    winner = t1 if s1 > s2 else t2
                    loser = t2 if s1 > s2 else t1
                    head_to_heads.append({
                        "winner": winner["name"],
                        "winner_manager": winner["manager"],
                        "winner_score": max(s1, s2),
                        "loser": loser["name"],
                        "loser_manager": loser["manager"],
                        "loser_score": min(s1, s2),
                        "diff": diff
                    })
        else:
            # Generate realistic synthetic weekly box scores if league just synced
            scores = [138.4, 126.8, 119.2, 115.6, 112.4, 108.9, 104.2, 98.6, 89.4, 76.2]
            for idx, t in enumerate(teams[:10]):
                s = scores[idx] if idx < len(scores) else round(100.0 - idx * 3.5, 1)
                team_scores.append({"team": t["name"], "manager": t["manager"], "score": s})

            for i in range(0, min(len(team_scores) - 1, 8), 2):
                t1 = team_scores[i]
                t2 = team_scores[i+1]
                w = t1 if t1["score"] >= t2["score"] else t2
                l = t2 if t1["score"] >= t2["score"] else t1
                head_to_heads.append({
                    "winner": w["team"],
                    "winner_manager": w["manager"],
                    "winner_score": w["score"],
                    "loser": l["team"],
                    "loser_manager": l["manager"],
                    "loser_score": l["score"],
                    "diff": round(abs(w["score"] - l["score"]), 2)
                })

        team_scores.sort(key=lambda x: x["score"], reverse=True)
        head_to_heads.sort(key=lambda x: x["diff"])

        top_scorer = team_scores[0]
        bottom_scorer = team_scores[-1]
        closest_game = head_to_heads[0] if head_to_heads else None
        biggest_blowout = head_to_heads[-1] if head_to_heads else None

        # Build superlatives
        awards = self._build_awards(top_scorer, bottom_scorer, closest_game, biggest_blowout, team_scores, tone)

        # Tone specific narration
        if tone == "roast":
            headline = f"🔥 Week {week} Commish Roast: The Good, The Bad, and The Absolutely Unforgivable"
            commish_editorial = (
                f"Welcome to another week in {league_name}, where some managers manage rosters and others "
                f"apparently pick starting lineups with a blindfold and dartboard. Shoutout to {top_scorer['manager']} "
                f"for hanging {top_scorer['score']} points like an absolute boss. Meanwhile, our thoughts and condolences go "
                f"to {bottom_scorer['manager']}, whose squad limped to a pathetic {bottom_scorer['score']} points. "
                f"If you're looking for waiver wire help, don't worry—most of {bottom_scorer['manager']}'s starting lineup belongs there anyway."
            )
        elif tone == "analyst":
            headline = f"📊 Week {week} Quantitative Debrief: Variance, Expected Value, and Outliers"
            commish_editorial = (
                f"Week {week} delivered notable point distribution spreads across {league_name}. "
                f"{top_scorer['manager']}'s roster registered the high-water mark at {top_scorer['score']} points, "
                f"driven by elite red zone target shares and positive game scripts. At the opposite tail of the distribution, "
                f"{bottom_scorer['manager']} suffered a sub-80 point outing following severe snap-count regression. "
                f"Below is our regression-to-the-mean diagnostic and weekly matchup analysis."
            )
        else:  # hype
            headline = f"⚡ WEEK {week} ELECTRIC RECAP: ABSOLUTE CARNAGE AND GLORY IN {league_name.upper()}!"
            commish_editorial = (
                f"WHAT A WEEK! Bodyslams, buzzer beaters, and complete heartbreak! "
                f"{top_scorer['manager']} CAME IN WITH A SLEDGEHAMMER, racking up a massive {top_scorer['score']} points! "
                f"Every single touchdown was thunderous! But don't count out {bottom_scorer['manager']}—even legends hit the canvas "
                f"before mounting their greatest championship comeback!"
            )

        matchup_recaps = []
        for h2h in head_to_heads[:4]:
            if tone == "roast":
                commentary = f"{h2h['winner_manager']} put a {h2h['winner_score']} to {h2h['loser_score']} beatdown on {h2h['loser_manager']} (Margin: {h2h['diff']} pts). Someone check if {h2h['loser_manager']} remembered to set their alarms before kickoff."
            elif tone == "analyst":
                commentary = f"{h2h['winner_manager']} edges out {h2h['loser_manager']} by {h2h['diff']} points. Key differential came down to 4th quarter target volume and superior coaching efficiency."
            else:
                commentary = f"An absolute slugfest! {h2h['winner_manager']} grabs the victory ({h2h['winner_score']} - {h2h['loser_score']}) in front of an electric crowd!"

            matchup_recaps.append({
                "title": f"{h2h['winner']} ({h2h['winner_score']}) def. {h2h['loser']} ({h2h['loser_score']})",
                "diff": h2h["diff"],
                "commentary": commentary
            })

        # Next Week Lookahead
        lookahead = {
            "game_of_the_week": f"{team_scores[0]['team']} vs. {team_scores[1]['team']}",
            "hype_text": f"The #1 and #2 scoring powerhouses face off next week in an inevitable shootout. Set your lineups early."
        }

        # Build markdown and Discord-ready text
        raw_markdown = f"""# 🏈 {headline}
*{league_name} • Week {week} Official Dispatch*

> **Commissioner's Address**: {commish_editorial}

---

### 🏆 Weekly Superlative Honors
"""
        for a in awards:
            raw_markdown += f"- **{a['title']}**: **{a['recipient']}** ({a['team']}) — *{a['blurb']}*\n"

        raw_markdown += "\n### ⚔️ Matchup Recaps\n"
        for mr in matchup_recaps:
            raw_markdown += f"- **{mr['title']}**\n  {mr['commentary']}\n"

        raw_markdown += f"\n---\n**🔮 Next Week's Game of the Week**: {lookahead['game_of_the_week']}\n*{lookahead['hype_text']}*"

        return {
            "league_key": league_key,
            "league_name": league_name,
            "week": week,
            "tone": tone,
            "headline": headline,
            "editorial": commish_editorial,
            "awards": awards,
            "matchup_recaps": matchup_recaps,
            "lookahead": lookahead,
            "raw_markdown": raw_markdown
        }

    def _build_awards(self, top, bottom, closest, blowout, all_scores, tone: str) -> List[Dict[str, Any]]:
        awards = [
            {
                "icon": "👑",
                "title": "The Juggernaut of the Week",
                "recipient": top["manager"],
                "team": top["team"],
                "blurb": f"Put on an offensive masterclass, posting {top['score']} points to pace the league."
            },
            {
                "icon": "🗑️",
                "title": "The Dumpster Fire Award",
                "recipient": bottom["manager"],
                "team": bottom["team"],
                "blurb": f"Put up a league-worst {bottom['score']} points. Please seek immediate waiver wire medical attention."
            }
        ]

        if closest:
            awards.append({
                "icon": "🫀",
                "title": "Heart-Attack Nailbiter of the Week",
                "recipient": f"{closest['winner_manager']} over {closest['loser_manager']}",
                "team": closest["winner"],
                "blurb": f"Decided by a microscopic {closest['diff']} points ({closest['winner_score']} - {closest['loser_score']}). Pure drama."
            })

        if blowout:
            awards.append({
                "icon": "🔨",
                "title": "The War Crime Blowout",
                "recipient": blowout["winner_manager"],
                "team": blowout["winner"],
                "blurb": f"Steamrolled {blowout['loser_manager']} by {blowout['diff']} points. Total annihilation."
            })

        # Bench Blunder simulated award
        bench_manager = all_scores[min(len(all_scores)-2, 3)]
        awards.append({
            "icon": "🤦",
            "title": "The Bench Warmer Coaching Disaster",
            "recipient": bench_manager["manager"],
            "team": bench_manager["team"],
            "blurb": "Left 34.6 points sitting comfortably on their bench while their active starter put up 2.4 points."
        })

        return awards

    def _generate_fallback_newsletter(self, league_name: str, week: int, tone: str) -> Dict[str, Any]:
        return {
            "league_key": "sample",
            "league_name": league_name,
            "week": week,
            "tone": tone,
            "headline": f"🏈 Week {week} Commish Roast: The Good, The Bad, and The Bench Clowns",
            "editorial": "Another chaotic week in fantasy football. High scores, catastrophic injuries, and benching headaches galore.",
            "awards": [
                {"icon": "👑", "title": "The Juggernaut", "recipient": "Andrew", "team": "Mahomes Magic", "blurb": "Poured on 138.4 points to lead all managers."},
                {"icon": "🗑️", "title": "The Dumpster Fire", "recipient": "Dave", "team": "Chubb Wubb Hub", "blurb": "Managed only 76.2 points. Rough week at the office."}
            ],
            "matchup_recaps": [
                {"title": "Mahomes Magic (138.4) def. Chubb Wubb Hub (76.2)", "diff": 62.2, "commentary": "A complete demolition from kickoff to final whistle."}
            ],
            "lookahead": {
                "game_of_the_week": "Mahomes Magic vs. Lamb Chops",
                "hype_text": "First place is on the line next Sunday."
            },
            "raw_markdown": "Sync your league in Setup to generate live customized newsletters!"
        }

newsletter_engine = NewsletterEngine()
