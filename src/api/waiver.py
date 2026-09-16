from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from src.waiver_engine import waiver_engine
from src.graph_db.driver import db_driver

router = APIRouter(prefix="/api/waiver", tags=["Waiver Wire Radar & FAAB Advisor"])

@router.get("/radar")
@router.get("/recommendations")
def get_waiver_recommendations(
    league_key: str = Query(...),
    team_key: Optional[str] = Query(None),
    position: str = Query("ALL")
):
    """Returns top waiver wire targets with suggested FAAB bids and breakout reasons."""
    try:
        effective_team_key = team_key
        if not effective_team_key:
            found = db_driver.execute_query("MATCH (t:Team) RETURN t.team_key AS team_key, t.is_user_team AS is_user")
            if found:
                user_t = next((t["team_key"] for t in found if t.get("is_user")), found[0]["team_key"])
                effective_team_key = user_t
            else:
                effective_team_key = f"{league_key}.t.1"
        return waiver_engine.get_waiver_recommendations(
            league_key=league_key,
            user_team_key=effective_team_key,
            position_filter=position
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Waiver calculation error: {str(e)}")
