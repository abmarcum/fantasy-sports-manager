from fastapi import APIRouter, Query, HTTPException
from src.waiver_engine import waiver_engine

router = APIRouter(prefix="/api/waiver", tags=["Waiver Wire Radar & FAAB Advisor"])

@router.get("/recommendations")
def get_waiver_recommendations(
    league_key: str = Query(...),
    team_key: str = Query(...),
    position: str = Query("ALL")
):
    """Returns top waiver wire targets with suggested FAAB bids and breakout reasons."""
    try:
        return waiver_engine.get_waiver_recommendations(
            league_key=league_key,
            user_team_key=team_key,
            position_filter=position
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Waiver calculation error: {str(e)}")
