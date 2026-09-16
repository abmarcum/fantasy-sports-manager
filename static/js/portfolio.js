// Multi-League & Multi-Platform Portfolio Manager

window.loadPortfolioView = async function() {
    const container = document.getElementById("portfolio-content-container");
    if (!container) return;

    container.innerHTML = '<div style="color:var(--text-muted)">Aggregating cross-league portfolios and scanning for conflicting matchups...</div>';

    try {
        const res = await fetch("/api/portfolio/summary");
        const data = await res.json();

        container.innerHTML = "";

        const teams = data.user_teams || [];
        const exposures = data.exposure_rankings || [];
        const conflicts = data.rooting_conflicts || [];

        // 1. Overview Summary Cards
        const topCards = document.createElement("div");
        topCards.className = "grid-3";
        topCards.style.marginBottom = "1.5rem";
        topCards.innerHTML = `
            <div class="glass-card" style="margin-bottom:0; text-align:center">
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase">Leagues Managed</div>
                <div style="font-size:2.2rem; font-weight:800; color:var(--primary); margin:0.25rem 0">${data.total_leagues || teams.length}</div>
                <div style="font-size:0.8rem; color:var(--text-dim)">Across Yahoo & Sleeper</div>
            </div>
            <div class="glass-card" style="margin-bottom:0; text-align:center">
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase">Core Pillars (High Stake)</div>
                <div style="font-size:2.2rem; font-weight:800; color:var(--accent); margin:0.25rem 0">
                    ${exposures.filter(e => e.exposure_pct >= 60).length}
                </div>
                <div style="font-size:0.8rem; color:var(--text-dim)">Rostered in ≥60% of leagues</div>
            </div>
            <div class="glass-card" style="margin-bottom:0; text-align:center">
                <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase">Conflicting Matchups</div>
                <div style="font-size:2.2rem; font-weight:800; color:var(--rose); margin:0.25rem 0">${conflicts.length}</div>
                <div style="font-size:0.8rem; color:var(--text-dim)">Opponent starting your player</div>
            </div>
        `;
        container.appendChild(topCards);

        // 2. Conflicting Matchup Radar (if any)
        if (conflicts.length > 0) {
            const conflictCard = document.createElement("div");
            conflictCard.className = "glass-card";
            conflictCard.style.marginBottom = "1.5rem";
            conflictCard.style.border = "1px solid rgba(225, 29, 72, 0.25)";
            conflictCard.style.background = "linear-gradient(180deg, #ffffff 0%, rgba(225, 29, 72, 0.02) 100%)";
            conflictCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                    <div>
                        <div style="font-size:1.15rem; font-weight:800; color:var(--rose)">🚨 Net Rooting Interest & Conflict Radar</div>
                        <div style="font-size:0.8rem; color:var(--text-muted)">Players you are starting in one league while facing in another</div>
                    </div>
                    <span style="background:rgba(225,29,72,0.1); color:var(--rose); font-size:0.8rem; font-weight:700; padding:0.3rem 0.6rem; border-radius:6px">
                        Direct Conflict Detected
                    </span>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.8rem">
                    ${conflicts.map(c => `
                        <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:8px; padding:1rem; display:flex; gap:1rem; align-items:center">
                            ${c.headshot_url ? `<img src="${c.headshot_url}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:1px solid #cbd5e1">` : ''}
                            <div style="flex:1">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem">
                                    <span style="font-weight:800; font-size:1rem; color:var(--text-main)">${c.player_name} <span class="pos-badge pos-${c.position}">${c.position}</span> <span style="font-size:0.8rem; color:var(--text-muted)">${c.nfl_team}</span></span>
                                    <span style="font-size:0.75rem; font-weight:700; color:var(--rose)">${c.severity}</span>
                                </div>
                                <div style="font-size:0.86rem; color:var(--text-main); margin-bottom:0.3rem">${c.situation}</div>
                                <div style="font-size:0.8rem; color:var(--primary); font-weight:600">🎯 Strategy: ${c.directive}</div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
            container.appendChild(conflictCard);
        }

        // 3. Cross-League Player Exposure Table
        const exposureCard = document.createElement("div");
        exposureCard.className = "glass-card";
        exposureCard.style.marginBottom = "1.5rem";
        exposureCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem">
                <div>
                    <div style="font-size:1.15rem; font-weight:800; color:var(--text-main)">📊 Cross-League Player Exposure Matrix</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Your investment distribution and roster shares across all active teams</div>
                </div>
            </div>

            <div style="overflow-x:auto">
                <table style="width:100%; border-collapse:collapse; font-size:0.88rem">
                    <thead>
                        <tr style="border-bottom:2px solid var(--glass-border); text-align:left; color:var(--text-muted); font-size:0.78rem">
                            <th style="padding:0.75rem">PLAYER</th>
                            <th style="padding:0.75rem">POSITION</th>
                            <th style="padding:0.75rem">SHARES OWNED</th>
                            <th style="padding:0.75rem">PORTFOLIO EXPOSURE</th>
                            <th style="padding:0.75rem">CLASSIFICATION</th>
                            <th style="padding:0.75rem">ACTIVE ROSTERS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exposures.map(p => `
                            <tr style="border-bottom:1px solid var(--glass-border); background:#ffffff">
                                <td style="padding:0.75rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:0.6rem">
                                    ${p.headshot_url ? `<img src="${p.headshot_url}" style="width:32px; height:32px; border-radius:50%; object-fit:cover">` : ''}
                                    ${p.name} <span style="font-size:0.75rem; color:var(--text-dim)">(${p.nfl_team})</span>
                                </td>
                                <td style="padding:0.75rem"><span class="pos-badge pos-${p.position}">${p.position}</span></td>
                                <td style="padding:0.75rem; font-weight:700; font-family:var(--font-mono)">${p.shares} of ${p.total_leagues}</td>
                                <td style="padding:0.75rem">
                                    <div style="display:flex; align-items:center; gap:0.5rem">
                                        <div style="flex:1; height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden">
                                            <div style="width:${p.exposure_pct}%; height:100%; background:var(--primary)"></div>
                                        </div>
                                        <span style="font-weight:700; font-size:0.8rem; font-family:var(--font-mono)">${p.exposure_pct}%</span>
                                    </div>
                                </td>
                                <td style="padding:0.75rem">
                                    <span style="font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:4px; ${
                                        p.category === 'Core Pillar' ? 'background:rgba(16,185,129,0.12); color:#059669' :
                                        (p.category === 'High Stake' ? 'background:rgba(79,70,229,0.1); color:var(--primary)' :
                                        'background:#f1f5f9; color:var(--text-muted)')
                                    }">
                                        ${p.category}
                                    </span>
                                </td>
                                <td style="padding:0.75rem; font-size:0.8rem; color:var(--text-muted)">
                                    ${(p.leagues || []).map(l => l.league_name).join(", ")}
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(exposureCard);

        // 4. Synced League Teams Overview
        const teamsCard = document.createElement("div");
        teamsCard.className = "glass-card";
        teamsCard.innerHTML = `
            <div style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem">🌐 Synced League Squads</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem">Quick status across all your fantasy franchises</div>

            <div class="grid-3" style="gap:1rem">
                ${teams.map(t => `
                    <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:10px; padding:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.03)">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem">
                            <span style="font-size:0.75rem; font-weight:700; color:var(--primary); text-transform:uppercase">${t.platform} League</span>
                            <span style="font-size:0.75rem; font-weight:700">${t.badge}</span>
                        </div>
                        <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:0.2rem">${t.team_name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.6rem">${t.league_name}</div>
                        <div style="display:flex; justify-content:space-between; font-size:0.82rem; border-top:1px solid #f1f5f9; padding-top:0.5rem">
                            <span>Record: <b>${t.record}</b></span>
                            <span>Rank: <b>${t.rank}</b></span>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
        container.appendChild(teamsCard);

    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading portfolio summary: ${e.message}</div>`;
    }
};
