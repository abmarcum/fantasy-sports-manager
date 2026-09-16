from fastapi import APIRouter, Query, HTTPException
from src.whatif_engine import whatif_engine

router = APIRouter(prefix="/api/whatif", tags=["What-If Schedule Re-Randomizer"])

@router.get("/simulate")
def simulate_alternate_schedule(league_key: str = Query(...), simulations: int = Query(1000)):
    """Runs 1,000 randomized schedule permutations to compute true expected wins and luck differentials."""
    try:
        return whatif_engine.simulate_alternate_universe(league_key=league_key, simulations=simulations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"What-if simulation error: {str(e)}")
