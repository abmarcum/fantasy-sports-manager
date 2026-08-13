import requests
from bs4 import BeautifulSoup
from typing import Dict, Any

class FantasyProsScraper:
    """Scrapes public consensus rankings & Fantasy Points Allowed (FPA) defensive ratings."""

    def get_matchup_difficulty_ratings(self, position: str = "QB") -> Dict[str, str]:
        """
        Scrapes or returns FPA difficulty rating for defenses vs a position.
        Returns map of NFL_TEAM_ABBR -> 'EASY' | 'NEUTRAL' | 'HARD'
        """
        pos = position.upper()
        # Default baseline defensive difficulty tiers
        ratings = {
            "CAR": "EASY", "ARI": "EASY", "WAS": "EASY", "LAC": "EASY",
            "SF": "HARD", "BAL": "HARD", "CLE": "HARD", "NYJ": "HARD", "DAL": "HARD"
        }
        try:
            url = f"https://www.fantasypros.com/nfl/points-allowed/{pos.lower()}.php"
            headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                table = soup.find("table", {"id": "data"})
                if table:
                    rows = table.find_all("tr")[1:]
                    for row in rows:
                        cols = row.find_all("td")
                        if len(cols) >= 2:
                            team_name = cols[0].text.strip()
                            # Convert team name to abbreviation
                            abbr = team_name[:3].upper()
                            rank_val = cols[1].text.strip()
                            try:
                                rank = int(rank_val)
                                if rank >= 22:
                                    ratings[abbr] = "EASY"
                                elif rank <= 10:
                                    ratings[abbr] = "HARD"
                                else:
                                    ratings[abbr] = "NEUTRAL"
                            except ValueError:
                                pass
        except Exception as e:
            print(f"FantasyPros scrape warning (using fallback tiers): {e}")
        return ratings

fantasypros_scraper = FantasyProsScraper()
