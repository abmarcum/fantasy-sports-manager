// Trade Synergy Finder & Waiver Target Module

window.loadTradeView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const container = document.getElementById("trade-proposals-container");
    if (!container) return;
    
    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted)">Please select a Yahoo league in Setup first.</div>';
        return;
    }
    
    container.innerHTML = '<div style="color:var(--text-muted)">Discovering Graph Trade Synergies...</div>';
    
    try {
        const res = await fetch(`/api/trade/synergies?league_key=${leagueKey}&user_team_key=${leagueKey}.t.1`);
        const data = await res.json();
        
        container.innerHTML = "";
        const proposals = data.proposals || [];
        
        if (proposals.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted)">No trade synergies detected yet. Sync your league graph to update rosters!</div>';
            return;
        }
        
        proposals.forEach(p => {
            const card = document.createElement("div");
            card.className = "glass-card";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                    <div style="font-weight:700; font-size:1.1rem; color:var(--text-main)">Trade Partner: ${p.partner_name} (${p.partner_manager})</div>
                    <span style="background:rgba(16,185,129,0.12); color:#059669; font-size:0.8rem; font-weight:700; padding:0.3rem 0.6rem; border-radius:6px">
                        ${p.trade_fairness_score}% Synergy Match
                    </span>
                </div>
                
                <div class="grid-2" style="margin-bottom:1rem">
                    <div style="background:#f8fafc; border:1px solid var(--glass-border); padding:0.75rem; border-radius:8px">
                        <div style="font-size:0.8rem; color:var(--accent); font-weight:700; margin-bottom:0.5rem">YOU RECEIVE:</div>
                        ${(p.receive_players || []).map(pl => `
                            <div style="font-weight:600; color:var(--text-main); margin-bottom:0.2rem">${pl.name} <span class="pos-badge pos-${pl.position}" style="margin-left:0.25rem">${pl.position}</span></div>
                        `).join("")}
                    </div>
                    <div style="background:#f8fafc; border:1px solid var(--glass-border); padding:0.75rem; border-radius:8px">
                        <div style="font-size:0.8rem; color:var(--rose); font-weight:700; margin-bottom:0.5rem">YOU GIVE:</div>
                        ${(p.give_players || []).map(pl => `
                            <div style="font-weight:600; color:var(--text-main); margin-bottom:0.2rem">${pl.name} <span class="pos-badge pos-${pl.position}" style="margin-left:0.25rem">${pl.position}</span></div>
                        `).join("")}
                    </div>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted)">💡 <i>${p.synergy_reason}</i></div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading trade suggestions: ${e.message}</div>`;
    }
};
