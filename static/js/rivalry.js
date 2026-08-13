// Manager Rivalry Matrix & Trophy Room Module

window.loadRivalryView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const container = document.getElementById("rivalry-content-container");
    if (!container) return;

    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">Please select and sync a league in Setup first.</div>';
        return;
    }

    container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">⚔️ Calculating Pairwise Manager Head-to-Head Rivalry Records...</div>';

    try {
        const res = await fetch(`/api/rivalry/matrix?league_key=${leagueKey}`);
        const data = await res.json();
        const matrix = data.matrix || [];
        const superlatives = data.superlatives || {};

        container.innerHTML = `
            <!-- Trophy Room Superlatives -->
            <div class="grid-2" style="margin-bottom:1.5rem">
                <div class="glass-card" style="margin-bottom:0; background:linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,1))">
                    <div style="font-size:1.4rem; margin-bottom:0.4rem">💥 Biggest Blowout in League History</div>
                    <div style="font-weight:700; color:var(--text-main); font-size:1.1rem">${superlatives.biggest_blowout?.team1} defeated ${superlatives.biggest_blowout?.team2}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem">Final Score: <b>${superlatives.biggest_blowout?.score}</b> (Margin: +${superlatives.biggest_blowout?.margin} pts in Wk ${superlatives.biggest_blowout?.week})</div>
                </div>

                <div class="glass-card" style="margin-bottom:0; background:linear-gradient(135deg, rgba(79,70,229,0.06), rgba(255,255,255,1))">
                    <div style="font-size:1.4rem; margin-bottom:0.4rem">⚡ Closest Nailbiter Finish</div>
                    <div style="font-weight:700; color:var(--text-main); font-size:1.1rem">${superlatives.closest_finish?.team1} vs ${superlatives.closest_finish?.team2}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem">Decided by <b>${superlatives.closest_finish?.margin} pts</b> (${superlatives.closest_finish?.score} in Wk ${superlatives.closest_finish?.week})</div>
                </div>
            </div>

            <!-- Rivalry Records Grid -->
            <div class="glass-card">
                <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:1rem; color:var(--text-main)">Manager Head-to-Head Records</h3>
                <div class="grid-2">
                    ${matrix.map(r => `
                        <div style="background:#f8fafc; border:1px solid var(--glass-border); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center">
                            <div>
                                <div style="font-weight:700; color:var(--text-main); font-size:0.95rem">${r.team1_name} <span style="font-weight:400; color:var(--text-muted)">vs</span> ${r.team2_name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem">Win Rate: <b>${r.win_percentage}%</b> · Tier: <span style="color:var(--primary); font-weight:600">${r.rivalry_tier}</span></div>
                            </div>
                            <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:6px; padding:0.3rem 0.6rem; font-weight:800; font-size:1rem; color:var(--primary)">
                                ${r.record}
                            </div>
                        </div>
                    `).join("") || '<div style="color:var(--text-muted)">No head-to-head match records recorded yet.</div>'}
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading rivalry matrix: ${e.message}</div>`;
    }
};
