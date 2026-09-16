from fastapi import APIRouter, HTTPException
from src.portfolio_engine import portfolio_engine

router = APIRouter(prefix="/api/portfolio", tags=["Multi-League Portfolio Manager"])

@router.get("/summary")
def get_portfolio_summary():
    """Fetches unified portfolio statistics, cross-league player exposure, and rooting conflicts."""
    try:
        return portfolio_engine.get_portfolio_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portfolio summary error: {str(e)}")
