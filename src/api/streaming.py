from fastapi import APIRouter, Query, HTTPException
from src.streaming_engine import streaming_engine

router = APIRouter(prefix="/api/streaming", tags=["DST & Kicker Streaming Exploiter"])

@router.get("/recommendations")
def get_streaming_recommendations(league_key: str = Query(...)):
    """Recommends top waiver wire streaming Defenses and Kickers based on matchups and Vegas totals."""
    try:
        return streaming_engine.get_streaming_recommendations(league_key=league_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming recommendation error: {str(e)}")
