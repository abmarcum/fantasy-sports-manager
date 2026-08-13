from fastapi import APIRouter
from src.graph_db.driver import db_driver

router = APIRouter(prefix="/api/graph", tags=["Cytoscape Graph Network"])

@router.get("/network")
def get_graph_network():
    """Formats Kùzu/Neo4j graph nodes and relationships for Cytoscape.js 2D canvas visualization."""
    nodes = []
    edges = []
    
    # Query Teams
    teams_query = "MATCH (t:Team) RETURN t.team_key AS id, t.name AS name, t.manager_name AS manager, t.logo_url AS logo_url"
    teams = db_driver.execute_query(teams_query)
    for t in teams:
        nodes.append({
            "data": {
                "id": str(t.get("id")),
                "label": t.get("name", "Team"),
                "subtitle": t.get("manager", ""),
                "type": "Team",
                "image": t.get("logo_url", ""),
                "color": "#3b82f6"
            }
        })

    # Query Players
    players_query = "MATCH (p:Player) RETURN p.player_key AS id, p.name AS name, p.position AS pos, p.headshot_url AS headshot LIMIT 100"
    players = db_driver.execute_query(players_query)
    for p in players:
        nodes.append({
            "data": {
                "id": str(p.get("id")),
                "label": p.get("name", "Player"),
                "subtitle": p.get("pos", ""),
                "type": "Player",
                "image": p.get("headshot", ""),
                "color": "#10b981" if p.get("pos") == "QB" else "#8b5cf6"
            }
        })

    # Query DRAFTED edges
    drafted_query = """
    MATCH (t:Team)-[r:DRAFTED]->(p:Player)
    RETURN t.team_key AS source, p.player_key AS target, r.pick_num AS pick_num
    """
    drafted = db_driver.execute_query(drafted_query)
    for idx, d in enumerate(drafted):
        edges.append({
            "data": {
                "id": f"draft_{idx}",
                "source": str(d.get("source")),
                "target": str(d.get("target")),
                "label": f"Pick #{d.get('pick_num')}",
                "color": "#64748b"
            }
        })

    # Query MATCHED_AGAINST edges
    matched_query = """
    MATCH (t1:Team)-[r:MATCHED_AGAINST]->(t2:Team)
    RETURN t1.team_key AS source, t2.team_key AS target, r.outcome AS outcome
    """
    matched = db_driver.execute_query(matched_query)
    for idx, m in enumerate(matched):
        edges.append({
            "data": {
                "id": f"match_{idx}",
                "source": str(m.get("source")),
                "target": str(m.get("target")),
                "label": f"Rivalry ({m.get('outcome')})",
                "color": "#ef4444"
            }
        })

    return {"nodes": nodes, "edges": edges}
