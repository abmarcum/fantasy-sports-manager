// Injury Handcuff Insurance & Vulnerability Matrix Module

window.loadHandcuffView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const teamKey = localStorage.getItem("selectedTeamKey") || (leagueKey ? `${leagueKey}.t.1` : "");
    const container = document.getElementById("handcuff-content-container");
    if (!container) return;

    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">Please select and sync a league in Setup first.</div>';
        return;
    }

    container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">🩹 Mapping NFL Depth Charts & Computing Roster Insurance Coverage...</div>';

    try {
        const res = await fetch(`/api/handcuff/matrix?league_key=${leagueKey}&team_key=${teamKey}`);
        const data = await res.json();
        const score = data.coverage_percentage || 0;
        const matrix = data.matrix || [];

        const scoreColor = score >= 75 ? '#059669' : (score >= 40 ? '#f59e0b' : '#dc2626');

        container.innerHTML = `
            <!-- Coverage Score Banner -->
            <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; background:linear-gradient(135deg, rgba(79,70,229,0.05), rgba(16,185,129,0.03))">
                <div>
                    <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main)">Handcuff Roster Protection Matrix</h3>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem">
                        Evaluated ${data.total_starters_evaluated} star players on your roster against all depth chart backups.
                    </div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted)">Insurance Coverage</div>
                    <div style="font-size:2rem; font-weight:900; color:${scoreColor}">${score}%</div>
                </div>
            </div>

            <!-- Handcuff List -->
            <div class="grid-2">
                ${matrix.map(m => {
                    const badgeBg = m.status_class === 'insured' ? 'rgba(16,185,129,0.12)' : (m.status_class === 'exposed' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)');
                    const badgeColor = m.status_class === 'insured' ? '#059669' : (m.status_class === 'exposed' ? '#dc2626' : '#d97706');

                    return `
                        <div class="glass-card" style="margin-bottom:0; display:flex; flex-direction:column; gap:0.75rem">
                            <div style="display:flex; justify-content:space-between; align-items:center">
                                <div>
                                    <span class="pos-badge pos-${m.position}">${m.position}</span>
                                    <span style="font-weight:800; font-size:1.1rem; color:var(--text-main); margin-left:0.4rem">${m.starter_name}</span>
                                    <span style="font-size:0.8rem; color:var(--text-muted)">(${m.nfl_team})</span>
                                </div>
                                <span style="background:${badgeBg}; color:${badgeColor}; font-size:0.75rem; font-weight:800; padding:0.25rem 0.6rem; border-radius:6px">${m.status}</span>
                            </div>

                            <div style="background:#f8fafc; border:1px solid var(--glass-border); border-radius:8px; padding:0.75rem; font-size:0.85rem">
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem">
                                    <span style="color:var(--text-muted)">Direct Backup Handcuff:</span>
                                    <b style="color:var(--text-main)">${m.handcuff_name}</b>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem">
                                    <span style="color:var(--text-muted)">Current Location:</span>
                                    <b style="color:var(--primary)">${m.location}</b>
                                </div>
                                <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed var(--glass-border); color:var(--text-muted); font-size:0.8rem">
                                    💡 <b>Advisor Tip</b>: ${m.action_tip}
                                </div>
                            </div>
                        </div>
                    `;
                }).join("") || '<div style="color:var(--text-muted); padding:1rem">No starting high-value running backs or receivers detected on this roster.</div>'}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading handcuff matrix: ${e.message}</div>`;
    }
};
