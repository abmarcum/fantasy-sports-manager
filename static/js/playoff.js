// Monte Carlo Playoff Machine & Championship Odds Simulator Module

window.loadPlayoffView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const container = document.getElementById("playoff-content-container");
    if (!container) return;

    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">Please select and sync a league in Setup first.</div>';
        return;
    }

    container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">🎲 Running 10,000 Monte Carlo Season Simulations & Calculating Playoff Probabilities...</div>';

    try {
        const res = await fetch(`/api/playoff/simulate?league_key=${leagueKey}&sim_runs=10000`);
        const data = await res.json();
        const teams = data.teams || [];

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem">
                <div>
                    <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main)">Monte Carlo Playoff & Championship Predictor</h3>
                    <div style="font-size:0.85rem; color:var(--text-muted)">Simulated 10,000 full remaining season permutations across all ${data.playoff_spots || 4} playoff berths</div>
                </div>
                <button onclick="window.loadPlayoffView()" class="btn" style="padding:0.5rem 1rem; font-size:0.85rem">🎲 Re-Simulate (10,000 Runs)</button>
            </div>

            <div class="glass-card" style="padding:0; overflow:hidden">
                <div style="overflow-x:auto">
                    <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid var(--glass-border); color:var(--text-muted)">
                                <th style="padding:0.9rem 1rem">Team / Manager</th>
                                <th style="padding:0.9rem 1rem">Record</th>
                                <th style="padding:0.9rem 1rem">Playoff %</th>
                                <th style="padding:0.9rem 1rem">1st-Round Bye %</th>
                                <th style="padding:0.9rem 1rem">Title Win %</th>
                                <th style="padding:0.9rem 1rem">Magic #</th>
                                <th style="padding:0.9rem 1rem">Remaining SOS</th>
                                <th style="padding:0.9rem 1rem">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${teams.map((t, idx) => {
                                const teamKey = localStorage.getItem("selectedTeamKey");
                                const isFocus = teamKey && t.team_key === teamKey;
                                const playoffColor = t.playoff_probability > 75 ? '#059669' : (t.playoff_probability > 30 ? '#4f46e5' : '#dc2626');
                                const champColor = t.championship_probability > 25 ? '#f59e0b' : '#64748b';

                                return `
                                    <tr style="border-bottom:1px solid var(--glass-border); background:${isFocus ? 'rgba(79, 70, 229, 0.05)' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfd')}">
                                        <td style="padding:0.9rem 1rem">
                                            <div style="font-weight:700; color:var(--text-main)">
                                                ${t.name}
                                                ${isFocus ? '<span class="badge-team-focus" style="font-size:0.65rem; margin-left:0.35rem">Your Team</span>' : ''}
                                            </div>
                                            <div style="font-size:0.75rem; color:var(--text-muted)">${t.manager}</div>
                                        </td>
                                        <td style="padding:0.9rem 1rem; font-weight:600">${t.current_record}</td>
                                        <td style="padding:0.9rem 1rem">
                                            <div style="font-weight:800; font-size:1.05rem; color:${playoffColor}">${t.playoff_probability}%</div>
                                            <div style="height:4px; background:#e2e8f0; border-radius:2px; width:80px; margin-top:0.25rem; overflow:hidden">
                                                <div style="width:${t.playoff_probability}%; height:100%; background:${playoffColor}"></div>
                                            </div>
                                        </td>
                                        <td style="padding:0.9rem 1rem; font-weight:600; color:var(--text-main)">${t.bye_probability}%</td>
                                        <td style="padding:0.9rem 1rem; font-weight:800; color:${champColor}">🏆 ${t.championship_probability}%</td>
                                        <td style="padding:0.9rem 1rem; font-weight:700; color:var(--text-main)">${t.magic_number}</td>
                                        <td style="padding:0.9rem 1rem">
                                            <span style="font-size:0.8rem; font-weight:600; padding:0.2rem 0.5rem; border-radius:4px; background:${t.remaining_sos === 'Easy' ? 'rgba(16,185,129,0.12)' : (t.remaining_sos === 'Tough' ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.12)')}; color:${t.remaining_sos === 'Easy' ? '#059669' : (t.remaining_sos === 'Tough' ? '#dc2626' : '#475569')}">${t.remaining_sos}</span>
                                        </td>
                                        <td style="padding:0.9rem 1rem">
                                            <span style="font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:9999px; background:${t.status_badge === 'Contender' ? 'rgba(16,185,129,0.15)' : 'rgba(79,70,229,0.15)'}; color:${t.status_badge === 'Contender' ? '#059669' : '#4338ca'}">${t.status_badge}</span>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error simulating playoff machine: ${e.message}</div>`;
    }
};
