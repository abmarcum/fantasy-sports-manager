from fastapi import APIRouter, Query, HTTPException
from src.handcuff_engine import handcuff_engine

router = APIRouter(prefix="/api/handcuff", tags=["Injury Handcuff Insurance Matrix"])

@router.get("/matrix")
def get_handcuff_matrix(league_key: str = Query(...), team_key: str = Query(...)):
    """Analyzes rostered starters and checks depth chart handcuff coverage and waiver availability."""
    try:
        return handcuff_engine.analyze_handcuff_matrix(league_key=league_key, user_team_key=team_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Handcuff analysis error: {str(e)}")
