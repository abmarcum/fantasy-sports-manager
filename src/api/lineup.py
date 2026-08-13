from fastapi import APIRouter, Query, HTTPException
from src.lineup_optimizer import lineup_optimizer

router = APIRouter(prefix="/api/lineup", tags=["AI Lineup Optimizer & Start/Sit"])

@router.get("/optimize")
def get_optimal_lineup(league_key: str = Query(...), team_key: str = Query(...)):
    """Calculates the mathematically optimal starting lineup and boom/bust projections."""
    try:
        return lineup_optimizer.get_optimal_lineup(league_key=league_key, team_key=team_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lineup optimization error: {str(e)}")

@router.get("/compare")
def compare_start_sit(p1: str = Query(...), p2: str = Query(...)):
    """Compares two players head-to-head with matchup metrics and AI start/sit verdict."""
    try:
        return lineup_optimizer.compare_players(player_key_1=p1, player_key_2=p2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Player comparison error: {str(e)}")
