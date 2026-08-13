from fastapi import APIRouter, Query, HTTPException
from src.trade_engine import trade_engine

router = APIRouter(prefix="/api/trade", tags=["Trade Synergy Finder"])

@router.get("/synergies")
def get_trade_synergies(league_key: str = Query(...), user_team_key: str = Query(...)):
    try:
        proposals = trade_engine.find_trade_synergies(league_key, user_team_key)
        return {"proposals": proposals}
    except Exception as e:
        return {"proposals": [], "error": str(e)}
