from fastapi import APIRouter, Query, HTTPException
from src.gameday_engine import gameday_engine

router = APIRouter(prefix="/api/gameday", tags=["Live Gameday & Vegas Odds"])

@router.get("/live")
def get_live_gameday(league_key: str = Query(...), team_key: str = Query(None)):
    """Fetches live in-game matchup scores, win probabilities, and swing events."""
    try:
        return gameday_engine.calculate_live_gameday(league_key=league_key, user_team_key=team_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Live gameday error: {str(e)}")

@router.get("/vegas-weather")
def get_vegas_and_weather(league_key: str = Query(...)):
    """Fetches Vegas Implied Team Totals, point spreads, game scripts, and weather conditions."""
    try:
        return gameday_engine.get_vegas_and_weather_slate(league_key=league_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vegas & weather error: {str(e)}")
