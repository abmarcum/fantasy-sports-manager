from fastapi import APIRouter, Query, HTTPException
from src.trade_engine import trade_engine
from src.blockbuster_trade_engine import blockbuster_trade_engine

router = APIRouter(prefix="/api/trade", tags=["Trade Synergy Finder"])

@router.get("/synergies")
def get_trade_synergies(league_key: str = Query(...), user_team_key: str = Query(...)):
    """Discovers win-win 2-team trade opportunities based on roster surplus and deficit."""
    try:
        proposals = trade_engine.find_trade_synergies(league_key, user_team_key)
        return {"proposals": proposals}
    except Exception as e:
        return {"proposals": [], "error": str(e)}

@router.get("/blockbuster")
def get_blockbuster_trades(league_key: str = Query(...), user_team_key: str = Query(None)):
    """Detects 3-team circular trade cycles that break 2-team negotiation deadlocks."""
    try:
        proposals = blockbuster_trade_engine.find_3team_blockbusters(league_key, user_team_key)
        return {"proposals": proposals}
    except Exception as e:
        return {"proposals": [], "error": str(e)}
