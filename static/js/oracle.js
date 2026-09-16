// AI Power Rankings & The Oracle Weekly Recap Module

window.loadOracleView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const container = document.getElementById("oracle-content-container");
    if (!container) return;

    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">Please select and sync a league in Setup first.</div>';
        return;
    }

    container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">🔮 The Oracle is analyzing league-wide scoring models, All-Play records, and luck indices...</div>';

    try {
        const res = await fetch(`/api/oracle/rankings?league_key=${leagueKey}`);
        const data = await res.json();
        const oracle = data.oracle || {};
        const rankings = data.rankings || [];

        container.innerHTML = `
            <!-- Oracle Narrative Story Card -->
            <div class="glass-card" style="background:linear-gradient(135deg, rgba(79,70,229,0.06), rgba(16,185,129,0.04)); border:1px solid rgba(79,70,229,0.2); margin-bottom:1.5rem">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem">
                    <span style="font-size:1.5rem">🔮</span>
                    <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-main)">${oracle.headline || 'Weekly Oracle League Analysis'}</h3>
                </div>
                <p style="font-size:0.95rem; color:var(--text-main); line-height:1.6; margin-bottom:1.25rem">
                    ${oracle.summary || ''}
                </p>

                <!-- Superlative Awards -->
                <div class="grid-2">
                    ${(oracle.awards || []).map(a => `
                        <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:8px; padding:0.75rem; box-shadow:0 1px 3px rgba(0,0,0,0.04)">
                            <div style="font-weight:700; font-size:0.95rem; color:var(--primary); margin-bottom:0.25rem">${a.title}</div>
                            <div style="font-weight:600; font-size:0.9rem; color:var(--text-main); margin-bottom:0.2rem">👤 ${a.team}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted)">${a.description}</div>
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- True Power Rankings Table -->
            <div class="glass-card">
                <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:1rem; color:var(--text-main)">🏆 Composite Graph Power Rankings</h3>
                <div style="overflow-x:auto">
                    <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem">
                        <thead>
                            <tr style="border-bottom:2px solid var(--glass-border); color:var(--text-muted)">
                                <th style="padding:0.75rem">Rank</th>
                                <th style="padding:0.75rem">Team / Manager</th>
                                <th style="padding:0.75rem">Actual W-L</th>
                                <th style="padding:0.75rem">All-Play W-L</th>
                                <th style="padding:0.75rem">Points For</th>
                                <th style="padding:0.75rem">Coaching Eff.</th>
                                <th style="padding:0.75rem">Luck Index</th>
                                <th style="padding:0.75rem">Power Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rankings.map(t => {
                                const teamKey = localStorage.getItem("selectedTeamKey");
                                const isFocus = teamKey && t.team_key === teamKey;
                                return `
                                <tr style="border-bottom:1px solid var(--glass-border); background:${isFocus ? 'rgba(79, 70, 229, 0.05)' : 'transparent'};">
                                    <td style="padding:0.75rem; font-weight:800; font-size:1.05rem; color:var(--primary)">#${t.rank}</td>
                                    <td style="padding:0.75rem">
                                        <div style="font-weight:700; color:var(--text-main)">
                                            ${t.name}
                                            ${isFocus ? '<span class="badge-team-focus" style="font-size:0.65rem; margin-left:0.35rem">Your Team</span>' : ''}
                                        </div>
                                        <div style="font-size:0.75rem; color:var(--text-muted)">${t.manager}</div>
                                    </td>
                                    <td style="padding:0.75rem; font-weight:600">${t.actual_record}</td>
                                    <td style="padding:0.75rem; font-weight:600; color:var(--primary)">${t.all_play_record}</td>
                                    <td style="padding:0.75rem; font-family:var(--font-mono)">${t.points_for}</td>
                                    <td style="padding:0.75rem; font-weight:600; color:var(--accent)">${t.coaching_efficiency}%</td>
                                    <td style="padding:0.75rem">
                                        <span style="font-size:0.8rem; font-weight:700">${t.luck_label}</span>
                                        <span style="font-size:0.75rem; color:var(--text-dim)">(${t.luck_index > 0 ? '+' : ''}${t.luck_index}%)</span>
                                    </td>
                                    <td style="padding:0.75rem">
                                        <span style="background:rgba(79,70,229,0.1); color:var(--primary); font-weight:800; padding:0.25rem 0.6rem; border-radius:4px; font-size:0.95rem">${t.power_score}</span>
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
        container.innerHTML = `<div style="color:var(--rose)">Error generating power rankings: ${e.message}</div>`;
    }
};
