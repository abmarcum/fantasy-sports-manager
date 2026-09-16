from fastapi import APIRouter, Query, HTTPException, Body
from typing import Dict, Any
from pydantic import BaseModel
from src.newsletter_engine import newsletter_engine
from src.webhook_dispatcher import webhook_dispatcher

router = APIRouter(prefix="/api/newsletter", tags=["AI League Newsletter & Webhook Bot"])

class BroadcastRequest(BaseModel):
    webhook_url: str
    payload_type: str = "newsletter"
    data: Dict[str, Any] = {}
    platform: str = "auto"

@router.get("/generate")
def generate_league_newsletter(
    league_key: str = Query(...),
    week: int = Query(1),
    tone: str = Query("roast")
):
    """Generates an AI Commissioner Weekly Newsletter with customizable tone ('roast', 'analyst', 'hype')."""
    try:
        return newsletter_engine.generate_weekly_newsletter(league_key=league_key, week=week, tone=tone)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Newsletter generation error: {str(e)}")

@router.post("/broadcast")
def broadcast_to_webhook(req: BroadcastRequest):
    """Broadcasts newsletters, power rankings, or test pings directly to Discord or Slack."""
    try:
        result = webhook_dispatcher.send_broadcast(
            webhook_url=req.webhook_url,
            payload_type=req.payload_type,
            data=req.data,
            platform=req.platform
        )
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message", "Webhook delivery failed"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook dispatch error: {str(e)}")
