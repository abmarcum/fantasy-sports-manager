import os
import json
import socket
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv, dotenv_values

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True, parents=True)

# Load .env file explicitly if present
env_file_path = BASE_DIR / ".env"
if env_file_path.exists():
    load_dotenv(dotenv_path=env_file_path, override=False)

cred_file = DATA_DIR / "credentials.json"
saved_creds = {}
if cred_file.exists():
    try:
        with open(cred_file, "r") as f:
            saved_creds = json.load(f)
    except Exception:
        pass

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

env_port = int(os.getenv("PORT", "5000"))
if is_port_in_use(env_port) and not os.path.exists("/app"):
    default_port = 5050
else:
    default_port = env_port

def is_env_configured() -> bool:
    """Checks if Yahoo Client ID and Secret are configured via .env file or environment variables."""
    env_vars = dotenv_values(env_file_path) if env_file_path.exists() else {}
    c_id = env_vars.get("YAHOO_CLIENT_ID") or os.environ.get("YAHOO_CLIENT_ID", "")
    c_secret = env_vars.get("YAHOO_CLIENT_SECRET") or os.environ.get("YAHOO_CLIENT_SECRET", "")
    
    valid_id = bool(c_id and "your_yahoo" not in c_id and len(c_id.strip()) > 0)
    valid_secret = bool(c_secret and "your_yahoo" not in c_secret and len(c_secret.strip()) > 0)
    return valid_id and valid_secret

class Settings(BaseSettings):
    APP_NAME: str = "Fantasy Sports Manager"
    DEBUG: bool = True
    PORT: int = default_port
    
    # Yahoo OAuth credentials
    YAHOO_CLIENT_ID: str = os.getenv("YAHOO_CLIENT_ID", saved_creds.get("YAHOO_CLIENT_ID", ""))
    YAHOO_CLIENT_SECRET: str = os.getenv("YAHOO_CLIENT_SECRET", saved_creds.get("YAHOO_CLIENT_SECRET", ""))
    YAHOO_REDIRECT_URI: str = os.getenv("YAHOO_REDIRECT_URI", saved_creds.get("YAHOO_REDIRECT_URI", f"http://localhost:{default_port}/api/auth/callback"))
    YAHOO_OAUTH_SCOPE: str = os.getenv("YAHOO_OAUTH_SCOPE", "fspt-r")
    
    # Graph Database Config
    DB_ENGINE: str = os.getenv("DB_ENGINE", "kuzu")
    KUZU_DB_PATH: str = str(DATA_DIR / "fantasy_graph.kuzu")
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "password")
    
    # Token persistence file
    TOKEN_FILE_PATH: str = str(DATA_DIR / "yahoo_tokens.json")

    def __init__(self, **values):
        super().__init__(**values)
        if self.KUZU_DB_PATH.startswith("/app/") and not os.path.exists("/app"):
            self.KUZU_DB_PATH = str(DATA_DIR / "fantasy_graph.kuzu")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

