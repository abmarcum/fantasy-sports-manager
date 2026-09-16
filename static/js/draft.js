// Live Draft Command Center Module

window.loadDraftView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const container = document.getElementById("draft-recommendations-list");
    if (!container) return;
    
    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted)">Please select and sync a Yahoo league in the Setup tab first.</div>';
        return;
    }
    
    container.innerHTML = '<div style="color:var(--text-muted)">Loading Graph Recommendations...</div>';
    
    try {
        const res = await fetch(`/api/draft/recommendations?league_key=${leagueKey}&user_team_key=${leagueKey}.t.1`);
        const data = await res.json();
        
        container.innerHTML = "";
        (data.recommendations || []).forEach((p, idx) => {
            const card = document.createElement("div");
            card.className = "player-card";
            card.onclick = () => window.openPlayerModal?.(p.player_key, p.name);
            
            const headshot = window.getPlayerHeadshot ? window.getPlayerHeadshot(p.headshot_url, p.player_key) : (p.headshot_url || window.DEFAULT_HEADSHOT);
            const reasonsHtml = (p.reasons || []).map(r => `<span style="font-size:0.75rem; color:var(--accent); display:block;">✨ ${r}</span>`).join("");
            
            card.innerHTML = `
                <img src="${headshot}" class="headshot" alt="${p.name}" onerror="this.onerror=null; this.src=window.DEFAULT_HEADSHOT;">
                <div style="flex:1">
                    <div style="font-weight:600">${p.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">${p.nfl_team} · Bye Wk ${p.bye_week}</div>
                    ${reasonsHtml}
                </div>
                <span class="pos-badge pos-${p.position}">${p.position}</span>
                <div style="text-align:right">
                    <div style="font-size:1.1rem; font-weight:700; color:var(--primary-glow)">${p.score}</div>
                    <div style="font-size:0.75rem; color:var(--text-dim)">VORP Score</div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading draft recommendations: ${e.message}</div>`;
    }
};
