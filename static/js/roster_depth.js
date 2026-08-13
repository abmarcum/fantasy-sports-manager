// Roster Depth & Positional Power Heatmap Module

window.loadRosterDepthView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const teamKey = localStorage.getItem("selectedTeamKey") || (leagueKey ? `${leagueKey}.t.1` : "");
    const container = document.getElementById("depth-content-container");
    if (!container) return;

    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">Please select and sync a league in Setup first.</div>';
        return;
    }

    container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">📊 Benchmarking Positional Strength against League Median...</div>';

    try {
        const res = await fetch(`/api/roster/depth?league_key=${leagueKey}&team_key=${teamKey}`);
        const data = await res.json();
        const comparison = data.comparison || [];

        container.innerHTML = `
            <!-- Trade Strategy Recommendation Box -->
            <div class="glass-card" style="background:linear-gradient(135deg, rgba(79,70,229,0.06), rgba(16,185,129,0.04)); border:1px solid rgba(79,70,229,0.2); margin-bottom:1.5rem">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem">
                    <span style="font-size:1.3rem">💡</span>
                    <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main)">Positional Surplus & Deficit Diagnosis</h3>
                </div>
                <p style="font-size:0.95rem; color:var(--text-main); line-height:1.5">
                    ${data.trade_recommendation}
                </p>
            </div>

            <!-- Positional Grid -->
            <div class="grid-3">
                ${comparison.map(c => {
                    const isPositive = c.difference >= 0;
                    const diffColor = isPositive ? '#059669' : '#dc2626';

                    return `
                        <div class="glass-card" style="margin-bottom:0; display:flex; flex-direction:column; gap:0.75rem">
                            <div style="display:flex; justify-content:space-between; align-items:center">
                                <span class="pos-badge pos-${c.position}" style="font-size:0.9rem; padding:0.3rem 0.6rem">${c.position} Power</span>
                                <span style="background:rgba(79,70,229,0.1); color:var(--primary); font-weight:800; font-size:0.85rem; padding:0.2rem 0.5rem; border-radius:4px">Grade ${c.grade}</span>
                            </div>

                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem">
                                    <span style="color:var(--text-muted)">Your Team:</span>
                                    <b style="color:var(--text-main)">${c.user_score} pts</b>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.4rem">
                                    <span style="color:var(--text-muted)">League Average:</span>
                                    <span style="color:var(--text-dim)">${c.league_avg} pts</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding-top:0.4rem; border-top:1px solid var(--glass-border)">
                                    <span style="color:var(--text-muted)">Net Difference:</span>
                                    <b style="color:${diffColor}">${isPositive ? '+' : ''}${c.difference} pts</b>
                                </div>
                            </div>

                            <div style="font-size:0.8rem; font-weight:700; color:${diffColor}">
                                ${c.status}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error benchmarking roster depth: ${e.message}</div>`;
    }
};
