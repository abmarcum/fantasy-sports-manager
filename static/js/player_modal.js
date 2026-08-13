// Player Profile Modal & Historical Game Logs Module

window.openPlayerModal = async function(playerKey, playerName) {
    const overlay = document.getElementById("player-modal-overlay");
    const container = document.getElementById("modal-player-content");
    if (!overlay || !container) return;
    
    overlay.classList.add("active");
    container.innerHTML = `<div style="color:var(--text-muted)">Loading ${playerName} Profile & Historical Game Logs...</div>`;
    
    const leagueKey = localStorage.getItem("selectedLeagueKey") || "";
    
    try {
        const [profRes, logRes] = await Promise.all([
            fetch(`/api/player/profile/${playerKey}`).then(r => r.json()),
            fetch(`/api/player/gamelogs/${playerKey}?league_key=${leagueKey}`).then(r => r.json())
        ]);
        
        const p = profRes.profile || {};
        const headshot = p.headshot_url || "https://s.yimg.com/lq/i/us/sp/v/nfl/players/50x50/3000.jpg";
        
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem">
                <div style="display:flex; align-items:center; gap:1.2rem">
                    <img src="${headshot}" class="headshot" style="width:70px; height:70px; border-color:var(--primary)" onerror="this.src='https://s.yimg.com/lq/i/us/sp/v/nfl/players/50x50/3000.jpg'">
                    <div>
                        <h2 style="font-size:1.6rem; font-weight:700">${p.name || playerName}</h2>
                        <div style="color:var(--text-muted); display:flex; gap:0.5rem; align-items:center; margin-top:0.25rem">
                            <span class="pos-badge pos-${p.position || 'FLEX'}">${p.position || 'FLEX'}</span>
                            <span>· ${p.nfl_team || 'NFL'} · Bye Week ${p.bye_week || '0'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="document.getElementById('player-modal-overlay').classList.remove('active')" style="background:transparent; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer">&times;</button>
            </div>
            
            <div style="margin-top:1.5rem">
                <h3 style="font-size:1.1rem; font-weight:600; margin-bottom:0.75rem; color:var(--text-main)">Season Stat Log Breakdown</h3>
                <div style="background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1rem">
                    <table style="width:100%; border-collapse:collapse; color:var(--text-main); font-size:0.9rem">
                        <thead>
                            <tr style="border-bottom:1px solid var(--glass-border); text-align:left; color:var(--text-muted)">
                                <th style="padding:0.5rem">Stat Metric</th>
                                <th style="padding:0.5rem">Recorded Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(logRes.stats || []).map(s => `
                                <tr style="border-bottom:1px solid var(--glass-border)">
                                    <td style="padding:0.5rem">Stat Category #${s.stat_id}</td>
                                    <td style="padding:0.5rem; font-weight:600; font-family:var(--font-mono); color:var(--primary)">${s.value}</td>
                                </tr>
                            `).join("") || '<tr><td colspan="2" style="padding:1rem; color:var(--text-dim)">No game logs recorded for this player yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading player profile: ${e.message}</div>`;
    }
};
