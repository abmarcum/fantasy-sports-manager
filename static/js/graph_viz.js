// Cytoscape.js Graph Network Visualizer Module

window.initCytoscapeGraph = async function() {
    const container = document.getElementById("cy-canvas");
    if (!container) return;
    
    if (typeof cytoscape === "undefined") {
        container.innerHTML = '<div style="color:var(--text-muted); padding:2rem">Cytoscape library loading...</div>';
        return;
    }
    
    try {
        const leagueKey = currentLeagueKey || localStorage.getItem("selectedLeagueKey") || "";
        const url = leagueKey ? `/api/graph/network?league_key=${encodeURIComponent(leagueKey)}` : "/api/graph/network";
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.nodes || data.nodes.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); padding:3rem; text-align:center">No graph data found. Please select and sync a league above!</div>';
            return;
        }

        const cy = cytoscape({
            container: container,
            elements: [...data.nodes, ...data.edges],
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'color': '#0f172a',
                        'font-size': '11px',
                        'font-family': 'Outfit, sans-serif',
                        'font-weight': '600',
                        'text-valign': 'bottom',
                        'text-margin-y': 6,
                        'background-color': 'data(color)',
                        'width': 40,
                        'height': 40,
                        'border-width': 2,
                        'border-color': '#ffffff'
                    }
                },
                {
                    selector: 'node[image]',
                    style: {
                        'background-image': 'data(image)',
                        'background-fit': 'cover',
                        'background-clip': 'node'
                    }
                },
                {
                    selector: 'node[type="Team"]',
                    style: {
                        'width': 56,
                        'height': 56,
                        'font-size': '13px',
                        'font-weight': '700',
                        'border-width': 3,
                        'border-color': '#3b82f6',
                        'background-color': '#eff6ff'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': 'data(color)',
                        'target-arrow-color': 'data(color)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'color': '#64748b',
                        'font-size': '10px'
                    }
                }
            ],
            layout: {
                name: 'cose',
                animate: true,
                padding: 30,
                nodeRepulsion: 8000,
                idealEdgeLength: 100
            }
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose); padding:2rem">Error rendering graph network: ${e.message}</div>`;
    }
};
