from fastapi import APIRouter, Query
from typing import Optional
from src.graph_db.driver import db_driver

router = APIRouter(prefix="/api/graph", tags=["Cytoscape Graph Network"])

@router.get("/network")
def get_graph_network(league_key: Optional[str] = Query(None), team_key: Optional[str] = Query(None)):
    """Formats Kùzu/Neo4j graph nodes and relationships for Cytoscape.js 2D canvas visualization."""
    nodes = []
    edges = []
    node_ids = set()

    # 1. Query Teams (filtered by league if provided)
    if league_key:
        teams_query = """
        MATCH (t:Team)-[:BELONGS_TO]->(l:League)
        WHERE l.league_key = $league_key
        RETURN t.team_key AS id, t.name AS name, t.manager_name AS manager, t.logo_url AS logo_url
        """
        teams = db_driver.execute_query(teams_query, {"league_key": league_key})
    else:
        teams_query = "MATCH (t:Team) RETURN t.team_key AS id, t.name AS name, t.manager_name AS manager, t.logo_url AS logo_url"
        teams = db_driver.execute_query(teams_query)

    for t in teams:
        tid = str(t.get("id"))
        if tid not in node_ids:
            node_ids.add(tid)
            is_focus = bool(team_key and tid == team_key)
            nodes.append({
                "data": {
                    "id": tid,
                    "label": f"⭐ {t.get('name', 'Team')}" if is_focus else t.get("name", "Team"),
                    "subtitle": t.get("manager", ""),
                    "type": "Team",
                    "image": t.get("logo_url", ""),
                    "color": "#10b981" if is_focus else "#3b82f6",
                    "is_focus": is_focus
                }
            })

    # 2. Query Players connected to those teams (no artificial LIMIT 100)
    if league_key:
        players_query = """
        MATCH (t:Team)-[:BELONGS_TO]->(l:League), (t)-[:DRAFTED|ROSTERED]->(p:Player)
        WHERE l.league_key = $league_key
        RETURN DISTINCT p.player_key AS id, p.player_id AS player_id, p.name AS name, p.position AS pos, p.headshot_url AS headshot
        """
        players = db_driver.execute_query(players_query, {"league_key": league_key})
    else:
        players_query = "MATCH (p:Player) RETURN p.player_key AS id, p.player_id AS player_id, p.name AS name, p.position AS pos, p.headshot_url AS headshot"
        players = db_driver.execute_query(players_query)

    for p in players:
        pid = str(p.get("id"))
        if pid not in node_ids:
            node_ids.add(pid)
            raw_headshot = p.get("headshot") or ""
            raw_pid = str(p.get("player_id") or "")
            clean_num = raw_pid if raw_pid.isdigit() else pid.replace("nfl.p.", "").strip()

            if clean_num.isdigit() and (not raw_headshot or "82x82" in raw_headshot or "50x50" in raw_headshot):
                raw_headshot = f"https://sports.yahoo.com/assets/og/player/nfl/{clean_num}/"

            nodes.append({
                "data": {
                    "id": pid,
                    "label": p.get("name", "Player"),
                    "subtitle": p.get("pos", ""),
                    "type": "Player",
                    "image": raw_headshot,
                    "color": "#10b981" if p.get("pos") == "QB" else "#8b5cf6"
                }
            })

    # 3. Query DRAFTED edges
    if league_key:
        drafted_query = """
        MATCH (t:Team)-[:BELONGS_TO]->(l:League), (t)-[r:DRAFTED]->(p:Player)
        WHERE l.league_key = $league_key
        RETURN t.team_key AS source, p.player_key AS target, r.pick_num AS pick_num
        """
        drafted = db_driver.execute_query(drafted_query, {"league_key": league_key})
    else:
        drafted_query = """
        MATCH (t:Team)-[r:DRAFTED]->(p:Player)
        RETURN t.team_key AS source, p.player_key AS target, r.pick_num AS pick_num
        """
        drafted = db_driver.execute_query(drafted_query)

    for idx, d in enumerate(drafted):
        src = str(d.get("source"))
        tgt = str(d.get("target"))
        # Strictly ensure both source and target nodes exist in the graph
        if src in node_ids and tgt in node_ids:
            edges.append({
                "data": {
                    "id": f"draft_{idx}",
                    "source": src,
                    "target": tgt,
                    "label": f"Pick #{d.get('pick_num')}",
                    "color": "#64748b"
                }
            })

    # 4. Query MATCHED_AGAINST edges
    matched_query = """
    MATCH (t1:Team)-[r:MATCHED_AGAINST]->(t2:Team)
    RETURN t1.team_key AS source, t2.team_key AS target, r.outcome AS outcome
    """
    matched = db_driver.execute_query(matched_query)
    for idx, m in enumerate(matched):
        src = str(m.get("source"))
        tgt = str(m.get("target"))
        if src in node_ids and tgt in node_ids:
            edges.append({
                "data": {
                    "id": f"match_{idx}",
                    "source": src,
                    "target": tgt,
                    "label": f"Rivalry ({m.get('outcome')})",
                    "color": "#ef4444"
                }
            })

    return {"nodes": nodes, "edges": edges}
