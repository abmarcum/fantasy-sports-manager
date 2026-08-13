from fastapi import APIRouter, Query, HTTPException
from src.roster_depth_engine import roster_depth_engine

router = APIRouter(prefix="/api/roster", tags=["Roster Depth & Positional Power Heatmap"])

@router.get("/depth")
def get_roster_depth(league_key: str = Query(...), team_key: str = Query(...)):
    """Calculates position-by-position power scores relative to league average."""
    try:
        return roster_depth_engine.analyze_roster_depth(league_key=league_key, user_team_key=team_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roster depth error: {str(e)}")
