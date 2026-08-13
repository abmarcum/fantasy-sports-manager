// AI Lineup Optimizer & Start/Sit Engine Module

window.loadLineupView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    const teamKey = localStorage.getItem("selectedTeamKey") || (leagueKey ? `${leagueKey}.t.1` : "");
    const container = document.getElementById("lineup-content-container");
    if (!container) return;

    if (!leagueKey) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">Please select and sync a league in the Setup tab first.</div>';
        return;
    }

    container.innerHTML = '<div style="color:var(--text-muted); padding:1rem">🧠 Calculating Mathematically Optimal Starting Lineup & Matchup Models...</div>';

    try {
        const res = await fetch(`/api/lineup/optimize?league_key=${leagueKey}&team_key=${teamKey}`);
        const data = await res.json();

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem">
                <div>
                    <h3 style="font-size:1.3rem; font-weight:700; color:var(--text-main)">Optimal Projected Output: <span style="color:var(--primary)">${data.optimal_projected_total} pts</span></h3>
                    <div style="font-size:0.85rem; color:var(--text-muted)">Solved via Monte Carlo simulations & defensive matchup ratings</div>
                </div>
                <button onclick="window.loadLineupView()" class="btn" style="padding:0.5rem 1rem; font-size:0.85rem">🔄 Re-Optimize</button>
            </div>

            <!-- Start/Sit Decider Tool -->
            <div class="glass-card" style="margin-bottom:1.5rem; background:#f8fafc; border:1px solid var(--glass-border)">
                <h3 style="font-size:1.1rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-main)">⚖️ Head-to-Head Start / Sit Decider</h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem">Select any two players to compare matchups, floor/ceiling volatility, and get an instant AI recommendation.</p>
                <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center">
                    <select id="compare-player-1" class="input-field" style="margin-bottom:0; max-width:250px">
                        ${(data.all_players || []).map((p, i) => `<option value="${p.player_key}" ${i === 0 ? 'selected' : ''}>${p.name} (${p.position} - ${p.nfl_team})</option>`).join("")}
                    </select>
                    <span style="font-weight:700; color:var(--text-muted)">VS</span>
                    <select id="compare-player-2" class="input-field" style="margin-bottom:0; max-width:250px">
                        ${(data.all_players || []).map((p, i) => `<option value="${p.player_key}" ${i === 1 ? 'selected' : ''}>${p.name} (${p.position} - ${p.nfl_team})</option>`).join("")}
                    </select>
                    <button id="btn-run-compare" class="btn btn-accent" style="padding:0.6rem 1.2rem; font-size:0.88rem">Compare Start / Sit</button>
                </div>
                <div id="start-sit-result" style="margin-top:1rem; display:none"></div>
            </div>

            <!-- Roster Breakdown -->
            <div class="grid-2">
                <div>
                    <h4 style="font-size:1rem; font-weight:700; color:var(--accent); margin-bottom:0.75rem">✅ RECOMMENDED STARTERS</h4>
                    <div id="optimal-starters-list">
                        ${(data.starters || []).map(p => renderPlayerCard(p, true)).join("")}
                    </div>
                </div>
                <div>
                    <h4 style="font-size:1rem; font-weight:700; color:var(--text-muted); margin-bottom:0.75rem">🪑 RECOMMENDED BENCH</h4>
                    <div id="optimal-bench-list">
                        ${(data.bench || []).map(p => renderPlayerCard(p, false)).join("")}
                    </div>
                </div>
            </div>
        `;

        // Bind comparison button
        document.getElementById("btn-run-compare")?.addEventListener("click", runStartSitComparison);

    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose); padding:1rem">Error optimizing lineup: ${e.message}</div>`;
    }
};

function renderPlayerCard(p, isStarter) {
    const headshot = p.headshot_url || "https://s.yimg.com/lq/i/us/sp/v/nfl/players/50x50/3000.jpg";
    const slotBadge = `<span style="background:var(--primary); color:white; font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:4px; margin-right:0.5rem">${p.roster_slot || p.position}</span>`;
    const gradeBadge = `<span style="background:${p.matchup_grade === 'A' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${p.matchup_grade === 'A' ? '#059669' : '#dc2626'}; font-size:0.75rem; font-weight:700; padding:0.15rem 0.4rem; border-radius:4px">Grade ${p.matchup_grade}</span>`;

    return `
        <div class="player-card" onclick="window.openPlayerModal?.('${p.player_key}', '${p.name}')">
            <img src="${headshot}" class="headshot" alt="${p.name}" onerror="this.src='https://s.yimg.com/lq/i/us/sp/v/nfl/players/50x50/3000.jpg'">
            <div style="flex:1">
                <div style="display:flex; align-items:center; gap:0.4rem">
                    ${isStarter ? slotBadge : ''}
                    <span style="font-weight:700; color:var(--text-main)">${p.name}</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem">
                    ${p.nfl_team} · ${p.position} · ${gradeBadge} · Boom ${p.boom_probability}%
                </div>
            </div>
            <div style="text-align:right">
                <div style="font-size:1.1rem; font-weight:700; color:var(--primary)">${p.projected_points} pts</div>
                <div style="font-size:0.75rem; color:var(--text-dim)">Floor ${p.floor_points} · Ceiling ${p.ceiling_points}</div>
            </div>
        </div>
    `;
}

async function runStartSitComparison() {
    const p1 = document.getElementById("compare-player-1")?.value;
    const p2 = document.getElementById("compare-player-2")?.value;
    const resultBox = document.getElementById("start-sit-result");
    if (!p1 || !p2 || !resultBox) return;

    resultBox.style.display = "block";
    resultBox.innerHTML = '<div style="color:var(--text-muted)">Analyzing matchup projections...</div>';

    try {
        const res = await fetch(`/api/lineup/compare?p1=${p1}&p2=${p2}`);
        const data = await res.json();

        resultBox.innerHTML = `
            <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1rem; margin-top:0.75rem">
                <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:0.75rem; margin-bottom:1rem">
                    <span style="font-weight:700; color:var(--accent)">🤖 AI Verdict:</span>
                    <span style="font-size:0.9rem; color:var(--text-main); margin-left:0.3rem">${data.verdict}</span>
                </div>
                <div class="grid-2">
                    <div style="background:#f8fafc; padding:0.75rem; border-radius:6px; border:1px solid var(--glass-border)">
                        <div style="font-weight:700; font-size:1rem; margin-bottom:0.4rem">${data.player1.name} (${data.player1.position})</div>
                        <div style="font-size:0.85rem; color:var(--text-muted)">Projected: <b>${data.player1.projected_points} pts</b> (Floor: ${data.player1.floor_points} / Ceiling: ${data.player1.ceiling_points})</div>
                        <div style="font-size:0.85rem; color:var(--text-muted)">Matchup Tier: <b>${data.player1.matchup_difficulty}</b></div>
                        <div style="font-size:0.85rem; color:var(--text-muted)">Target Trend: <b>${data.player1.target_share_trend}</b></div>
                    </div>
                    <div style="background:#f8fafc; padding:0.75rem; border-radius:6px; border:1px solid var(--glass-border)">
                        <div style="font-weight:700; font-size:1rem; margin-bottom:0.4rem">${data.player2.name} (${data.player2.position})</div>
                        <div style="font-size:0.85rem; color:var(--text-muted)">Projected: <b>${data.player2.projected_points} pts</b> (Floor: ${data.player2.floor_points} / Ceiling: ${data.player2.ceiling_points})</div>
                        <div style="font-size:0.85rem; color:var(--text-muted)">Matchup Tier: <b>${data.player2.matchup_difficulty}</b></div>
                        <div style="font-size:0.85rem; color:var(--text-muted)">Target Trend: <b>${data.player2.target_share_trend}</b></div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        resultBox.innerHTML = `<div style="color:var(--rose)">Error running comparison: ${e.message}</div>`;
    }
}
