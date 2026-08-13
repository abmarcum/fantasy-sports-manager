from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from src.draft_engine import draft_engine
from src.yahoo_client import yahoo_client

router = APIRouter(prefix="/api/draft", tags=["Draft Manager"])

class PickPayload(BaseModel):
    league_key: str
    team_key: str
    player_key: str
    pick_num: int
    round_num: int

@router.get("/recommendations")
def get_recommendations(league_key: str = Query(...), user_team_key: str = Query(...)):
    try:
        recs = draft_engine.get_draft_recommendations(league_key, user_team_key)
        return {"recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft engine error: {str(e)}")

@router.post("/pick")
def record_pick(payload: PickPayload):
    try:
        draft_engine.sync_draft_pick(
            team_key=payload.team_key,
            player_key=payload.player_key,
            pick_num=payload.pick_num,
            round_num=payload.round_num
        )
        return {"status": "success", "message": f"Pick #{payload.pick_num} recorded in Graph DB."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft pick logging error: {str(e)}")
