from fastapi import APIRouter, Query, HTTPException
from src.player_engine import player_engine
from src.yahoo_client import yahoo_client

router = APIRouter(prefix="/api/player", tags=["Player Cards & Game Logs"])

@router.get("/profile/{player_key}")
def get_player_profile(player_key: str):
    profile = player_engine.get_player_profile(player_key)
    return {"profile": profile}

@router.get("/gamelogs/{player_key}")
def get_player_gamelogs(player_key: str, league_key: str = Query(...)):
    try:
        logs = yahoo_client.get_player_game_logs(league_key, player_key)
        return logs
    except Exception as e:
        return {"player": {"player_key": player_key}, "stats": [], "error": str(e)}
