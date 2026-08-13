// Cytoscape.js Graph Network Visualizer Module

window.initCytoscapeGraph = async function() {
    const container = document.getElementById("cy-canvas");
    if (!container) return;
    
    if (typeof cytoscape === "undefined") {
        container.innerHTML = '<div style="color:var(--text-muted); padding:2rem">Cytoscape library loading...</div>';
        return;
    }
    
    try {
        const res = await fetch("/api/graph/network");
        const data = await res.json();
        
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
                        'width': 36,
                        'height': 36,
                        'border-width': 2,
                        'border-color': '#ffffff'
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
                padding: 30
            }
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose); padding:2rem">Error rendering graph network: ${e.message}</div>`;
    }
};
