from fastapi import APIRouter, Query, HTTPException
from src.playoff_machine import playoff_machine

router = APIRouter(prefix="/api/playoff", tags=["Monte Carlo Playoff Machine"])

@router.get("/simulate")
def simulate_playoff_chances(league_key: str = Query(...), sim_runs: int = Query(10000)):
    """Runs 10,000 Monte Carlo simulations to calculate playoff odds, bye odds, and championship win %."""
    try:
        return playoff_machine.simulate_season(league_key=league_key, sim_runs=sim_runs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Playoff simulation error: {str(e)}")
