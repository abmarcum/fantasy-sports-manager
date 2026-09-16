import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from config import settings
from src.api import auth, league, draft, matchups, player, trade, graph_viz, lineup, waiver, oracle, playoff, handcuff, sleeper, rivalry, roster_depth, gameday, newsletter, portfolio, whatif, streaming
from src.graph_db.driver import db_driver

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Perform graph DB initialization on app startup
    _ = db_driver.backend
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Production Fantasy Sports Manager powered by AI and Graph DBs",
    version="1.0.0",
    lifespan=lifespan
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(league.router)
app.include_router(draft.router)
app.include_router(matchups.router)
app.include_router(player.router)
app.include_router(trade.router)
app.include_router(graph_viz.router)
app.include_router(lineup.router)
app.include_router(waiver.router)
app.include_router(oracle.router)
app.include_router(playoff.router)
app.include_router(handcuff.router)
app.include_router(sleeper.router)
app.include_router(rivalry.router)
app.include_router(roster_depth.router)
app.include_router(gameday.router)
app.include_router(newsletter.router)
app.include_router(portfolio.router)
app.include_router(whatif.router)
app.include_router(streaming.router)

# Mount Static Assets
static_dir = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    """Serves the Single Page Glassmorphic Web App."""
    return FileResponse(static_dir / "index.html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=False)
