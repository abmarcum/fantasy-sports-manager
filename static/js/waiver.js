// Waiver Wire Radar & FAAB Bid Advisor Module

window.loadWaiverView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const teamKey = localStorage.getItem("selectedTeamKey") || (leagueKey ? `${leagueKey}.t.1` : "");
    const container = document.getElementById("waiver-list-container");
    if (!container) return;

    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">Please select and sync a league in Setup first.</div>';
        return;
    }

    container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">📡 Scanning Waiver Wire Free Agents & Calculating Dynamic FAAB Bids...</div>';

    const currentFilter = window.activeWaiverFilter || "ALL";

    try {
        const res = await fetch(`/api/waiver/recommendations?league_key=${leagueKey}&team_key=${teamKey}&position=${currentFilter}`);
        const data = await res.json();

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem">
                <div>
                    <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-main)">Top Priority Free Agent Pickups</h3>
                    <div style="font-size:0.85rem; color:var(--text-muted)">Ranked by usage surge, opportunity breakout, and team deficit need</div>
                </div>
                <div style="display:flex; gap:0.4rem;">
                    ${["ALL", "QB", "RB", "WR", "TE"].map(pos => `
                        <button class="btn ${currentFilter === pos ? '' : 'btn-accent'}" style="padding:0.35rem 0.8rem; font-size:0.8rem; ${currentFilter === pos ? 'background:var(--primary)' : 'background:#f1f5f9; color:#475569;'}" onclick="setWaiverFilter('${pos}')">${pos}</button>
                    `).join("")}
                </div>
            </div>

            <div class="grid-2">
                ${(data.recommendations || []).map(p => {
                    const headshot = window.getPlayerHeadshot ? window.getPlayerHeadshot(p.headshot_url, p.player_key) : (p.headshot_url || window.DEFAULT_HEADSHOT);
                    const needBadge = p.is_team_need ? '<span style="background:rgba(245,158,11,0.15); color:#d97706; font-size:0.75rem; font-weight:700; padding:0.15rem 0.4rem; border-radius:4px">🎯 Team Need</span>' : '';
                    
                    return `
                        <div class="glass-card player-card" style="margin-bottom:0; flex-direction:column; align-items:stretch; gap:0.75rem" onclick="window.openPlayerModal?.('${p.player_key}', '${p.name}')">
                            <div style="display:flex; justify-content:space-between; align-items:center">
                                <div style="display:flex; align-items:center; gap:0.75rem">
                                    <img src="${headshot}" class="headshot" alt="${p.name}" onerror="this.onerror=null; this.src=window.DEFAULT_HEADSHOT;">
                                    <div>
                                        <div style="font-weight:700; font-size:1.05rem; color:var(--text-main)">${p.name}</div>
                                        <div style="font-size:0.8rem; color:var(--text-muted)">
                                            ${p.nfl_team} · <span class="pos-badge pos-${p.position}">${p.position}</span> · Bye Wk ${p.bye_week} ${needBadge}
                                        </div>
                                    </div>
                                </div>
                                <div style="text-align:right">
                                    <div style="background:rgba(79,70,229,0.1); border:1px solid rgba(79,70,229,0.25); border-radius:6px; padding:0.25rem 0.5rem; display:inline-block">
                                        <div style="font-size:0.75rem; color:var(--primary); font-weight:700">FAAB Bid</div>
                                        <div style="font-size:1.1rem; font-weight:800; color:var(--primary)">${p.recommended_faab}</div>
                                    </div>
                                </div>
                            </div>
                            <div style="background:#f8fafc; border:1px solid var(--glass-border); border-radius:6px; padding:0.6rem; font-size:0.83rem; color:var(--text-main)">
                                📈 <b>Breakout Signal</b>: ${p.surge_reason}
                            </div>
                        </div>
                    `;
                }).join("") || '<div style="color:var(--text-muted)">No free agents found for this filter.</div>'}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading waiver radar: ${e.message}</div>`;
    }
};

window.setWaiverFilter = function(pos) {
    window.activeWaiverFilter = pos;
    window.loadWaiverView();
};
