// League-Wide Matchups Analyzer Module

window.loadMatchupsView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const container = document.getElementById("matchups-list-container");
    if (!container) return;
    
    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted)">Please select a Yahoo league in the Setup tab first.</div>';
        return;
    }
    
    container.innerHTML = '<div style="color:var(--text-muted)">Analyzing League Head-to-Head Matchups...</div>';
    
    try {
        const res = await fetch(`/api/matchups/league?league_key=${leagueKey}&week=1`);
        const data = await res.json();
        
        container.innerHTML = "";
        const matchups = data.matchups || [];
        
        if (matchups.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted)">No active matchups found. Sync your league to update.</div>';
            return;
        }
        
        matchups.forEach(m => {
            const card = document.createElement("div");
            card.className = "glass-card matchup-card";
            
            const t1 = m.team1;
            const t2 = m.team2;
            
            card.innerHTML = `
                <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600">WEEK ${m.week} MATCHUP</div>
                
                <div class="matchup-team">
                    <div style="font-weight:600">${t1.name}</div>
                    <div style="text-align:right">
                        <span style="font-size:1.2rem; font-weight:800">${t1.points}</span>
                        <span style="font-size:0.8rem; color:var(--text-dim)"> / proj ${t1.projected}</span>
                    </div>
                </div>
                
                <div class="prob-bar-container">
                    <div class="prob-bar" style="width:${t1.win_probability}%; background:var(--primary)"></div>
                    <div class="prob-bar" style="width:${t2.win_probability}%; background:var(--cyan)"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted)">
                    <span>${t1.win_probability}% Win Prob</span>
                    <span>${t2.win_probability}% Win Prob</span>
                </div>
                
                <div class="matchup-team">
                    <div style="font-weight:600">${t2.name}</div>
                    <div style="text-align:right">
                        <span style="font-size:1.2rem; font-weight:800">${t2.points}</span>
                        <span style="font-size:0.8rem; color:var(--text-dim)"> / proj ${t2.projected}</span>
                    </div>
                </div>
                
                <div style="font-size:0.8rem; color:var(--text-muted); background:#f1f5f9; border:1px solid var(--glass-border); padding:0.5rem; border-radius:6px;">
                    ⚔️ Manager Rivalry Record: <b>${t1.h2h_wins} Wins</b> vs <b>${t2.h2h_wins} Wins</b>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading matchups: ${e.message}</div>`;
    }
};
