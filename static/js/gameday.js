// Live Gameday Intelligence, Vegas Implied Totals & Weather Impact Matrix

window.loadGamedayView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey") || "sample";
    const teamKey = localStorage.getItem("selectedTeamKey") || "";
    const container = document.getElementById("gameday-content-container");
    if (!container) return;

    container.innerHTML = '<div style="color:var(--text-muted)">Connecting to live scoreboard, Vegas lines, and weather feeds...</div>';

    try {
        const [liveRes, vegasRes] = await Promise.all([
            fetch(`/api/gameday/live?league_key=${leagueKey}${teamKey ? `&team_key=${teamKey}` : ''}`),
            fetch(`/api/gameday/vegas-weather?league_key=${leagueKey}`)
        ]);

        const liveData = await liveRes.json();
        const vegasData = await vegasRes.json();

        container.innerHTML = "";

        const match = liveData.matchup || {};
        const myTeam = match.my_team || {};
        const oppTeam = match.opp_team || {};
        const winProb = match.win_probability || 50.0;
        const oppProb = match.opp_win_probability || 50.0;

        // 1. Live Matchup & Win Probability Command Header
        const headerCard = document.createElement("div");
        headerCard.className = "glass-card";
        headerCard.style.marginBottom = "1.5rem";
        headerCard.style.background = "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)";
        headerCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem">
                <div style="display:flex; align-items:center; gap:0.6rem">
                    <span style="font-size:1.5rem">⚡</span>
                    <div>
                        <div style="font-size:1.2rem; font-weight:800; color:var(--text-main)">Live Game Day Win Probability & Scoreboard</div>
                        <div style="font-size:0.8rem; color:var(--text-muted)">Real-time Monte Carlo probability curve updating live</div>
                    </div>
                </div>
                <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:0.4rem 0.8rem; font-weight:700; font-size:0.85rem; color:var(--text-main)">
                    ⏱️ Game Clock: <span style="color:var(--primary)">${match.game_clock || 'In Progress'}</span>
                </div>
            </div>

            <!-- Scoreboard Grid -->
            <div style="display:grid; grid-template-columns: 1fr auto 1fr; gap:1.5rem; align-items:center; margin-bottom:1.5rem">
                <!-- My Team -->
                <div style="background:#ffffff; border:2px solid ${winProb >= 50 ? 'var(--accent)' : '#e2e8f0'}; border-radius:12px; padding:1.25rem; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.04)">
                    <div style="font-size:0.85rem; font-weight:700; color:var(--text-muted); text-transform:uppercase">Your Team</div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0.25rem 0">${myTeam.name || 'My Team'}</div>
                    <div style="font-size:2.4rem; font-weight:800; color:var(--primary); font-family:var(--font-mono)">${myTeam.live_score || 0}</div>
                    <div style="font-size:0.82rem; color:var(--text-muted)">Proj Remaining: <b>${myTeam.proj_remaining || 0} pts</b> • Final: <b>${myTeam.total_projected || 0}</b></div>
                </div>

                <!-- VS Badge -->
                <div style="text-align:center">
                    <div style="font-weight:800; font-size:1.1rem; color:var(--text-dim); margin-bottom:0.4rem">VS</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${myTeam.players_active || 0} active / ${myTeam.players_remaining || 0} to play</div>
                </div>

                <!-- Opponent -->
                <div style="background:#ffffff; border:2px solid ${oppProb >= 50 ? 'var(--rose)' : '#e2e8f0'}; border-radius:12px; padding:1.25rem; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.04)">
                    <div style="font-size:0.85rem; font-weight:700; color:var(--text-muted); text-transform:uppercase">Opponent</div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin:0.25rem 0">${oppTeam.name || 'Opponent'}</div>
                    <div style="font-size:2.4rem; font-weight:800; color:var(--text-main); font-family:var(--font-mono)">${oppTeam.live_score || 0}</div>
                    <div style="font-size:0.82rem; color:var(--text-muted)">Proj Remaining: <b>${oppTeam.proj_remaining || 0} pts</b> • Final: <b>${oppTeam.total_projected || 0}</b></div>
                </div>
            </div>

            <!-- Win Probability Meter -->
            <div style="margin-bottom:0.75rem">
                <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.9rem; margin-bottom:0.4rem">
                    <span style="color:var(--accent)">🟢 You: ${winProb}% Win Chance</span>
                    <span style="color:var(--rose)">🔴 Opponent: ${oppProb}%</span>
                </div>
                <div style="height:14px; background:#f1f5f9; border-radius:7px; overflow:hidden; display:flex">
                    <div style="width:${winProb}%; background:linear-gradient(90deg, #10b981, #059669); transition:width 0.4s ease"></div>
                    <div style="width:${oppProb}%; background:linear-gradient(90deg, #f43f5e, #e11d48); transition:width 0.4s ease"></div>
                </div>
            </div>
        `;
        container.appendChild(headerCard);

        // 2. Play-by-Play Swing Meter & Rooting Interest Grid
        const swingCard = document.createElement("div");
        swingCard.className = "grid-2";
        swingCard.style.marginBottom = "1.5rem";
        swingCard.innerHTML = `
            <!-- Live Swing Meter -->
            <div class="glass-card" style="margin-bottom:0">
                <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:0.4rem">📈 Live Play-by-Play Swing Meter</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem">Highest win-probability impacts from recent plays</div>
                <div style="display:flex; flex-direction:column; gap:0.6rem">
                    ${(liveData.recent_swings || []).map(s => `
                        <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:8px; padding:0.75rem; display:flex; justify-content:space-between; align-items:center">
                            <div>
                                <div style="font-weight:700; font-size:0.9rem; color:var(--text-main)">${s.player} <span style="font-size:0.75rem; color:var(--text-dim)">(${s.team})</span></div>
                                <div style="font-size:0.8rem; color:var(--text-muted)">${s.play} • <span style="font-size:0.75rem; color:var(--text-dim)">${s.time}</span></div>
                            </div>
                            <div style="text-align:right">
                                <span style="font-weight:800; font-size:0.95rem; color:${s.swing_type === 'positive' ? '#059669' : '#e11d48'}">
                                    ${s.swing_pct}
                                </span>
                                <div style="font-size:0.75rem; color:var(--text-muted)">+${s.points_added} pts</div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- Rooting Interest Heatmap -->
            <div class="glass-card" style="margin-bottom:0">
                <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:0.4rem">🎯 Net Rooting Interest Directives</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem">Targeted game outcomes to maximize your win probability</div>
                <div style="display:flex; flex-direction:column; gap:0.6rem">
                    ${(liveData.rooting_matrix || []).map(r => `
                        <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:8px; padding:0.75rem">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem">
                                <span style="font-weight:700; font-size:0.9rem; color:var(--text-main)">${r.game}</span>
                                <span style="font-size:0.72rem; font-weight:700; background:rgba(79,70,229,0.1); color:var(--primary); padding:0.2rem 0.5rem; border-radius:4px">${r.urgency} PRIORITY</span>
                            </div>
                            <div style="font-size:0.84rem; color:var(--text-main); margin-bottom:0.3rem">👉 ${r.rooting_directive}</div>
                            <div style="font-size:0.76rem; color:var(--accent); font-weight:600">${r.net_swing_per_drive}</div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
        container.appendChild(swingCard);

        // 3. Vegas Odds & Weather Slate Card
        const vegasSection = document.createElement("div");
        vegasSection.className = "glass-card";
        vegasSection.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem">
                <div>
                    <div style="font-size:1.15rem; font-weight:800; color:var(--text-main)">🎲 Vegas Implied Team Totals & Stadium Weather Matrix</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Game scripts, over/unders, wind speed, and climate impact on fantasy scoring</div>
                </div>
                <div style="font-size:0.8rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.3rem 0.6rem; color:var(--text-muted)">
                    O/U ≥ 50 = Shootout • Wind ≥ 18 mph = Downgrade K/Deep WR
                </div>
            </div>

            <div class="grid-2" style="gap:1rem">
                ${(vegasData.games || []).map(g => `
                    <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:10px; padding:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.03)">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem">
                            <span style="font-weight:800; font-size:1.05rem; color:var(--text-main)">${g.matchup}</span>
                            <span style="font-weight:700; font-size:0.8rem; background:#f1f5f9; padding:0.25rem 0.6rem; border-radius:6px; color:var(--text-muted)">
                                O/U ${g.over_under} • ${g.spread_display}
                            </span>
                        </div>

                        <!-- Implied Team Totals Bar -->
                        <div style="display:flex; justify-content:space-between; background:#f8fafc; border-radius:6px; padding:0.5rem 0.75rem; margin-bottom:0.75rem; font-size:0.85rem">
                            ${Object.entries(g.implied_totals || {}).map(([tm, total]) => `
                                <span><b>${tm}</b> Implied Total: <span style="font-weight:800; color:var(--primary)">${total} pts</span></span>
                            `).join(" • ")}
                        </div>

                        <!-- Weather & Environmental Conditions -->
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem">
                            <span style="font-size:0.85rem">
                                ${g.is_dome ? '🏟️' : (g.weather.wind_mph >= 15 ? '💨' : '🌤️')}
                            </span>
                            <div style="font-size:0.82rem; font-weight:600; color:var(--text-main)">
                                ${g.stadium} • ${g.weather.condition} (${g.weather.temp_f}°F, ${g.weather.wind_mph} mph wind)
                            </div>
                            <span style="margin-left:auto; font-size:0.72rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:4px; ${
                                g.weather.risk_level === 'HIGH' ? 'background:rgba(225,29,72,0.1); color:var(--rose)' :
                                (g.weather.risk_level === 'MODERATE' ? 'background:rgba(245,158,11,0.1); color:var(--amber)' :
                                'background:rgba(16,185,129,0.1); color:#059669')
                            }">
                                ${g.weather.risk_level} WEATHER RISK
                            </span>
                        </div>

                        <!-- Impact Analysis & Game Script -->
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.4rem; line-height:1.35">
                            ${g.weather.impact_analysis}
                        </div>
                        <div style="font-size:0.8rem; color:var(--primary); font-weight:600">
                            ${g.game_script}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
        container.appendChild(vegasSection);

    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading Game Day & Vegas engine: ${e.message}</div>`;
    }
};
