from fastapi import APIRouter, Query, HTTPException
from src.power_rankings import power_rankings_engine

router = APIRouter(prefix="/api/oracle", tags=["AI Power Rankings & Oracle Recaps"])

@router.get("/rankings")
def get_league_power_rankings(league_key: str = Query(...)):
    """Calculates AI power rankings, All-Play records, coaching efficiency, and Oracle awards."""
    try:
        return power_rankings_engine.calculate_power_rankings(league_key=league_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Power rankings calculation error: {str(e)}")
