from fastapi import APIRouter, Query, HTTPException
from src.rivalry_engine import rivalry_engine

router = APIRouter(prefix="/api/rivalry", tags=["Manager Rivalry Matrix & Trophy Room"])

@router.get("/matrix")
def get_rivalry_matrix(league_key: str = Query(...)):
    """Computes pairwise head-to-head records and rivalry superlatives across all league teams."""
    try:
        return rivalry_engine.get_rivalry_matrix(league_key=league_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rivalry matrix error: {str(e)}")
