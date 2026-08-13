from fastapi import APIRouter, Query, HTTPException
from src.yahoo_client import yahoo_client
from src.matchup_engine import matchup_engine

router = APIRouter(prefix="/api/matchups", tags=["League Matchups Analysis"])

@router.get("/league")
def get_league_matchups(league_key: str = Query(...), week: int = Query(None)):
    try:
        scoreboard = yahoo_client.get_league_scoreboard(league_key, week)
        analyzed = matchup_engine.analyze_league_matchups(scoreboard)
        return {
            "week": scoreboard.get("week", week or 1),
            "matchups": analyzed
        }
    except Exception as e:
        # Fallback response if unauthenticated or demo mode
        return {
            "week": week or 1,
            "matchups": [],
            "error": str(e)
        }
