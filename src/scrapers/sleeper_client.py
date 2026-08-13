import requests
from typing import Dict, List, Any, Optional

SLEEPER_BASE_URL = "https://api.sleeper.app/v1"

class SleeperClient:
    """Free public API client for Sleeper NFL leagues, rosters, and player depth charts."""

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Fetch Sleeper user profile by username."""
        try:
            res = requests.get(f"{SLEEPER_BASE_URL}/user/{username.strip()}", timeout=8)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"Sleeper user fetch error: {e}")
        return None

    def get_user_leagues(self, user_id: str, season: str = "2024") -> List[Dict[str, Any]]:
        """Fetch all leagues for a Sleeper user in a season."""
        try:
            res = requests.get(f"{SLEEPER_BASE_URL}/user/{user_id}/leagues/nfl/{season}", timeout=8)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"Sleeper leagues fetch error: {e}")
        return []

    def get_league(self, league_id: str) -> Optional[Dict[str, Any]]:
        """Fetch league metadata."""
        try:
            res = requests.get(f"{SLEEPER_BASE_URL}/league/{league_id}", timeout=8)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"Sleeper league fetch error: {e}")
        return None

    def get_league_users(self, league_id: str) -> List[Dict[str, Any]]:
        """Fetch all users in a league."""
        try:
            res = requests.get(f"{SLEEPER_BASE_URL}/league/{league_id}/users", timeout=8)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"Sleeper league users fetch error: {e}")
        return []

    def get_league_rosters(self, league_id: str) -> List[Dict[str, Any]]:
        """Fetch all rosters and player assignments in a league."""
        try:
            res = requests.get(f"{SLEEPER_BASE_URL}/league/{league_id}/rosters", timeout=8)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"Sleeper league rosters fetch error: {e}")
        return []

    def get_trending_players(self, type: str = "add", lookback_hours: int = 24, limit: int = 25) -> List[Dict[str, Any]]:
        """Fetch trending player adds or drops across Sleeper leagues."""
        try:
            res = requests.get(f"{SLEEPER_BASE_URL}/players/nfl/trending/{type}?lookback_hours={lookback_hours}&limit={limit}", timeout=5)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"Sleeper trending fetch error: {e}")
        return []

sleeper_client = SleeperClient()
