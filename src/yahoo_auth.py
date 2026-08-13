import json
import time
import os
import requests
from requests.auth import HTTPBasicAuth
from config import settings

AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth"
TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"

class YahooOAuth:
    @property
    def client_id(self) -> str:
        return settings.YAHOO_CLIENT_ID

    @property
    def client_secret(self) -> str:
        return settings.YAHOO_CLIENT_SECRET

    @property
    def redirect_uri(self) -> str:
        return settings.YAHOO_REDIRECT_URI

    @property
    def token_file(self) -> str:
        return settings.TOKEN_FILE_PATH

    def get_auth_url(self, redirect_uri: str = None, state: str = "ff_manager") -> str:
        """Returns authorization URL for the user to visit and grant access."""
        r_uri = redirect_uri or self.redirect_uri
        params = {
            "client_id": self.client_id,
            "redirect_uri": r_uri,
            "response_type": "code",
            "state": state,
            "scope": "fspt-w"
        }
        req = requests.Request("GET", AUTH_URL, params=params)
        return req.prepare().url

    def get_token_from_code(self, code: str, redirect_uri: str = None) -> dict:
        """Exchanges authorization code for access and refresh tokens."""
        r_uri = redirect_uri or self.redirect_uri
        data = {
            "grant_type": "authorization_code",
            "redirect_uri": r_uri,
            "code": code
        }
        auth = HTTPBasicAuth(self.client_id, self.client_secret)
        response = requests.post(TOKEN_URL, data=data, auth=auth, headers={"Content-Type": "application/x-www-form-urlencoded"})
        
        if response.status_code != 200:
            raise ValueError(f"Failed to obtain token from code: {response.text}")
            
        token_data = response.json()
        token_data["expires_at"] = time.time() + token_data.get("expires_in", 3600)
        self.save_tokens(token_data)
        return token_data

    def refresh_access_token(self, refresh_token: str) -> dict:
        """Refreshes access token using stored refresh token."""
        data = {
            "grant_type": "refresh_token",
            "redirect_uri": self.redirect_uri,
            "refresh_token": refresh_token
        }
        auth = HTTPBasicAuth(self.client_id, self.client_secret)
        response = requests.post(TOKEN_URL, data=data, auth=auth, headers={"Content-Type": "application/x-www-form-urlencoded"})
        
        if response.status_code != 200:
            raise ValueError(f"Failed to refresh access token: {response.text}")
            
        token_data = response.json()
        token_data["expires_at"] = time.time() + token_data.get("expires_in", 3600)
        
        # Merge with previous refresh token if new one not returned
        existing = self.load_tokens() or {}
        if "refresh_token" not in token_data and "refresh_token" in existing:
            token_data["refresh_token"] = existing["refresh_token"]
            
        self.save_tokens(token_data)
        return token_data

    def save_tokens(self, token_data: dict):
        """Persists OAuth tokens to local file."""
        os.makedirs(os.path.dirname(self.token_file), exist_ok=True)
        with open(self.token_file, "w") as f:
            json.dump(token_data, f, indent=2)

    def clear_tokens(self):
        """Removes saved OAuth tokens for logout / session reset."""
        if os.path.exists(self.token_file):
            try:
                os.remove(self.token_file)
            except Exception as e:
                print(f"Error removing token file: {e}")

    def load_tokens(self) -> dict | None:
        """Loads saved OAuth tokens if file exists."""
        if not os.path.exists(self.token_file):
            return None
        try:
            with open(self.token_file, "r") as f:
                return json.load(f)
        except Exception:
            return None

    def get_valid_access_token(self) -> str | None:
        """Returns valid access token, auto-refreshing if expired."""
        tokens = self.load_tokens()
        if not tokens:
            return None
            
        # Check token expiration (with 60-second buffer)
        if time.time() >= tokens.get("expires_at", 0) - 60:
            if "refresh_token" in tokens:
                try:
                    tokens = self.refresh_access_token(tokens["refresh_token"])
                except Exception as e:
                    print(f"Error refreshing token: {e}")
                    return None
            else:
                return None
                
        return tokens.get("access_token")

    def is_authenticated(self) -> bool:
        """Checks if valid tokens are present."""
        return self.get_valid_access_token() is not None

    def get_auth_headers(self) -> dict:
        """Returns HTTP headers dictionary with Bearer token."""
        token = self.get_valid_access_token()
        if not token:
            raise RuntimeError("User is not authenticated with Yahoo. Please complete OAuth authorization flow.")
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }

yahoo_oauth = YahooOAuth()
