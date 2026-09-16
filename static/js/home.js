// Home Dashboard & Command Center Module

window.loadHomeView = async function() {
    const container = document.getElementById("home-content-container");
    if (!container) return;

    const leagueKey = localStorage.getItem("selectedLeagueKey") || "";
    const teamKey = localStorage.getItem("selectedTeamKey") || (leagueKey ? `${leagueKey}.t.1` : "");

    // If no league has been selected or synced yet, render an engaging Onboarding / Welcome Hero
    if (!leagueKey) {
        renderHomeOnboarding(container);
        return;
    }

    // Render loading skeleton
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem">
            <div>
                <h1 style="font-size:1.6rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem">🏈 Manager Command Center</h1>
                <p style="color:var(--text-muted); font-size:0.9rem">Active Intelligence, Real-Time Projections & League Operations</p>
            </div>
            <div style="display:flex; gap:0.75rem; align-items:center">
                <button onclick="window.loadHomeView()" class="btn" style="padding:0.5rem 1rem; font-size:0.85rem">🔄 Refresh Dashboard</button>
                <button onclick="window.switchTab('setup')" class="btn" style="padding:0.5rem 1rem; font-size:0.85rem; background:#ffffff; color:var(--text-main); border:1px solid var(--glass-border)">⚙️ League Settings</button>
            </div>
        </div>

        <div style="color:var(--text-muted); padding:2rem; text-align:center; background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-lg)">
            <div style="font-size:2rem; margin-bottom:0.5rem">⚡</div>
            <div style="font-weight:600">Loading your AI command center data...</div>
        </div>
    `;

    try {
        // Parallel fetch for dashboard widgets: matchups, power rankings, lineup, waivers
        const [matchupsRes, oracleRes, lineupRes, waiversRes] = await Promise.allSettled([
            fetch(`/api/matchups/league?league_key=${leagueKey}`).then(r => r.json()),
            fetch(`/api/oracle/rankings?league_key=${leagueKey}`).then(r => r.json()),
            fetch(`/api/lineup/optimize?league_key=${leagueKey}&team_key=${teamKey}`).then(r => r.json()),
            fetch(`/api/waiver/radar?league_key=${leagueKey}`).then(r => r.json())
        ]);

        const matchupsData = matchupsRes.status === "fulfilled" ? matchupsRes.value : null;
        const oracleData = oracleRes.status === "fulfilled" ? oracleRes.value : null;
        const lineupData = lineupRes.status === "fulfilled" ? lineupRes.value : null;
        const waiversData = waiversRes.status === "fulfilled" ? waiversRes.value : null;

        const isSleeper = leagueKey.startsWith("sleeper_");
        const leaguePlatform = isSleeper ? "Sleeper League" : "Yahoo Fantasy";

        // Find user's active matchup
        let userMatchup = null;
        if (matchupsData && matchupsData.matchups && matchupsData.matchups.length > 0) {
            userMatchup = matchupsData.matchups.find(m => 
                (m.team_1 && (m.team_1.team_key === teamKey || m.team_1.is_user_team)) ||
                (m.team_2 && (m.team_2.team_key === teamKey || m.team_2.is_user_team))
            ) || matchupsData.matchups[0];
        }

        // Top team/manager in power rankings
        const rankings = oracleData?.rankings || [];
        const userRanking = rankings.find(r => r.team_key === teamKey || r.is_user_team) || rankings[0] || null;
        const oracleHeadline = oracleData?.oracle?.headline || "Weekly League Briefing Active";
        const oracleSummary = oracleData?.oracle?.summary || "AI models have updated your power ratings, win probability curves, and high-leverage trade trajectories.";

        // Optimal points projection
        const optimalPoints = lineupData?.optimal_projected_total || null;
        const startersCount = lineupData?.starters?.length || 0;

        // Waiver top targets count
        const topWaiverCount = waiversData?.recommendations?.length || 0;
        const topWaiverTarget = waiversData?.recommendations?.[0] || null;

        container.innerHTML = `
            <!-- Header Status Banner -->
            <div class="glass-card home-banner" style="margin-bottom:1.5rem; background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(2,132,199,0.06)); border:1px solid rgba(79,70,229,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem">
                    <div style="display:flex; align-items:center; gap:1rem">
                        <div class="brand-icon" style="width:48px; height:48px; font-size:1.5rem">🏈</div>
                        <div>
                            <div style="display:flex; align-items:center; gap:0.6rem">
                                <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-main)">Manager Command Center</h2>
                                <span class="home-badge" style="background:${isSleeper ? 'rgba(2,132,199,0.12)' : 'rgba(16,185,129,0.12)'}; color:${isSleeper ? 'var(--cyan)' : 'var(--accent)'}; font-weight:700; padding:0.2rem 0.6rem; border-radius:6px; font-size:0.75rem">
                                    ${leaguePlatform}
                                </span>
                            </div>
                            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.15rem">
                                League Key: <code style="font-size:0.8rem">${leagueKey}</code> · ${userRanking ? `Power Rank: <b>#${userRanking.rank}</b> (${userRanking.power_score || 85} pts)` : 'Active Analytics Engine'}
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap">
                        <button onclick="window.quickSyncCurrentLeague()" id="btn-home-quicksync" class="btn btn-accent" style="padding:0.5rem 1rem; font-size:0.85rem">
                            ⚡ Quick Sync DB
                        </button>
                        <button onclick="window.switchTab('setup')" class="btn" style="padding:0.5rem 1rem; font-size:0.85rem; background:#ffffff; color:var(--text-main); border:1px solid #cbd5e1; box-shadow:0 1px 2px rgba(0,0,0,0.05)">
                            ⚙️ Switch League
                        </button>
                    </div>
                </div>
            </div>

            <!-- Top Row: Matchup & AI Manager Intel -->
            <div class="grid-2" style="margin-bottom:1.5rem">
                <!-- Left: Matchup & Win Probability Widget -->
                <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                            <h3 class="card-title" style="margin-bottom:0">⚔️ This Week's Matchup Snapshot</h3>
                            <span style="font-size:0.8rem; font-weight:700; color:var(--primary); background:rgba(79,70,229,0.08); padding:0.25rem 0.6rem; border-radius:9999px">
                                Week ${matchupsData?.week || 1}
                            </span>
                        </div>

                        ${userMatchup ? `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1rem; margin-bottom:1rem">
                                <div style="flex:1">
                                    <div style="font-weight:700; color:var(--text-main); font-size:1.05rem">${userMatchup.team_1.name}</div>
                                    <div style="font-size:0.8rem; color:var(--text-muted)">${userMatchup.team_1.manager || ''}</div>
                                    <div style="font-size:1.3rem; font-weight:800; color:var(--primary); margin-top:0.25rem">${userMatchup.team_1.projected_score} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500">proj</span></div>
                                </div>

                                <div style="text-align:center; padding:0 1rem">
                                    <span style="font-size:1.1rem; font-weight:800; color:var(--text-dim)">VS</span>
                                </div>

                                <div style="flex:1; text-align:right">
                                    <div style="font-weight:700; color:var(--text-main); font-size:1.05rem">${userMatchup.team_2.name}</div>
                                    <div style="font-size:0.8rem; color:var(--text-muted)">${userMatchup.team_2.manager || ''}</div>
                                    <div style="font-size:1.3rem; font-weight:800; color:var(--text-main); margin-top:0.25rem">${userMatchup.team_2.projected_score} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500">proj</span></div>
                                </div>
                            </div>

                            <!-- Win Probability Meter -->
                            <div style="margin-bottom:1rem">
                                <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:700; margin-bottom:0.35rem">
                                    <span style="color:var(--primary)">${userMatchup.team_1.name}: ${userMatchup.team_1_win_prob}%</span>
                                    <span style="color:var(--text-muted)">${userMatchup.team_2.name}: ${userMatchup.team_2_win_prob}%</span>
                                </div>
                                <div class="prob-bar-container" style="height:10px">
                                    <div class="prob-bar" style="width:${userMatchup.team_1_win_prob}%; background:linear-gradient(90deg, var(--primary), var(--cyan));"></div>
                                    <div class="prob-bar" style="width:${userMatchup.team_2_win_prob}%; background:#cbd5e1;"></div>
                                </div>
                            </div>
                        ` : `
                            <div style="background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1rem; color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem">
                                Active matchup data ready for Week ${matchupsData?.week || 1}. Open Matchups analyzer for full league-wide projections.
                            </div>
                        `}
                    </div>

                    <div style="display:flex; gap:0.75rem; margin-top:0.5rem">
                        <button onclick="window.switchTab('lineup')" class="btn btn-accent" style="flex:1; justify-content:center; padding:0.6rem">
                            🧠 Set AI Lineup
                        </button>
                        <button onclick="window.switchTab('matchups')" class="btn" style="flex:1; justify-content:center; padding:0.6rem; background:#ffffff; color:var(--text-main); border:1px solid var(--glass-border)">
                            ⚔️ All Matchups
                        </button>
                    </div>
                </div>

                <!-- Right: AI Manager Intel & Action Items -->
                <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                            <h3 class="card-title" style="margin-bottom:0">🔮 AI Manager Briefing & High-Priority Actions</h3>
                            <span style="font-size:0.8rem; font-weight:700; color:var(--accent); background:rgba(16,185,129,0.1); padding:0.25rem 0.6rem; border-radius:9999px">
                                4 Live Signals
                            </span>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:0.75rem">
                            <!-- Alert 1: Lineup Output -->
                            <div onclick="window.switchTab('lineup')" class="home-alert-item" style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:0.75rem 1rem; cursor:pointer; transition:all 0.2s ease">
                                <div style="display:flex; align-items:center; gap:0.75rem">
                                    <span style="font-size:1.2rem">🧠</span>
                                    <div>
                                        <div style="font-weight:700; font-size:0.9rem; color:var(--text-main)">Optimal Starting Lineup Solved</div>
                                        <div style="font-size:0.78rem; color:var(--text-muted)">${optimalPoints ? `Projected output: <b>${optimalPoints} pts</b> across ${startersCount} slots` : 'Monte Carlo start/sit simulations ready'}</div>
                                    </div>
                                </div>
                                <span style="font-size:0.8rem; color:var(--primary); font-weight:700">Review Lineup →</span>
                            </div>

                            <!-- Alert 2: Handcuff Matrix -->
                            <div onclick="window.switchTab('handcuff')" class="home-alert-item" style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:0.75rem 1rem; cursor:pointer; transition:all 0.2s ease">
                                <div style="display:flex; align-items:center; gap:0.75rem">
                                    <span style="font-size:1.2rem">🩹</span>
                                    <div>
                                        <div style="font-weight:700; font-size:0.9rem; color:var(--text-main)">Injury Handcuff Protection</div>
                                        <div style="font-size:0.78rem; color:var(--text-muted)">Examine depth charts and secure high-leverage insurance backups</div>
                                    </div>
                                </div>
                                <span style="font-size:0.8rem; color:var(--primary); font-weight:700">Check Matrix →</span>
                            </div>

                            <!-- Alert 3: Waiver Radar -->
                            <div onclick="window.switchTab('waiver')" class="home-alert-item" style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:0.75rem 1rem; cursor:pointer; transition:all 0.2s ease">
                                <div style="display:flex; align-items:center; gap:0.75rem">
                                    <span style="font-size:1.2rem">📡</span>
                                    <div>
                                        <div style="font-weight:700; font-size:0.9rem; color:var(--text-main)">Waiver Radar & FAAB Advisor</div>
                                        <div style="font-size:0.78rem; color:var(--text-muted)">${topWaiverTarget ? `Top target: <b>${topWaiverTarget.name}</b> (${topWaiverTarget.position}) · Rec bid: $${topWaiverTarget.faab_bid || 12}` : 'Target share spikes and breakout free agents detected'}</div>
                                    </div>
                                </div>
                                <span style="font-size:0.8rem; color:var(--primary); font-weight:700">Scan Radar →</span>
                            </div>

                            <!-- Alert 4: Playoff Odds -->
                            <div onclick="window.switchTab('playoff')" class="home-alert-item" style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:0.75rem 1rem; cursor:pointer; transition:all 0.2s ease">
                                <div style="display:flex; align-items:center; gap:0.75rem">
                                    <span style="font-size:1.2rem">🎲</span>
                                    <div>
                                        <div style="font-weight:700; font-size:0.9rem; color:var(--text-main)">10k-Run Monte Carlo Playoff Machine</div>
                                        <div style="font-size:0.78rem; color:var(--text-muted)">Simulate remaining schedules, championship probabilities & bye paths</div>
                                    </div>
                                </div>
                                <span style="font-size:0.8rem; color:var(--primary); font-weight:700">Simulate →</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center">
                        <span style="font-size:0.8rem; color:var(--text-muted)">Powered by Kùzu Graph Engine & LLM Intelligence</span>
                        <button onclick="window.switchTab('oracle')" class="btn" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:transparent; color:var(--primary); border:none">Read Oracle Recap →</button>
                    </div>
                </div>
            </div>

            <!-- Quick Launch Analytics Hub (11 Feature Cards Grid) -->
            <div class="glass-card" style="margin-bottom:1.5rem">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem">
                    <div>
                        <h3 class="card-title" style="margin-bottom:0.2rem">🚀 Quick Launch Analytics Hub</h3>
                        <p style="font-size:0.85rem; color:var(--text-muted)">Jump directly into any AI or Graph tool</p>
                    </div>
                </div>

                    <!-- Tool 1: Gameday -->
                    <div class="home-feature-card" onclick="window.switchTab('gameday')">
                        <div class="home-feature-icon">⚡</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Live Gameday & Vegas</div>
                            <div class="home-feature-desc">Live win probability, play swing meter, Vegas implied totals & weather.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 2: Streaming -->
                    <div class="home-feature-card" onclick="window.switchTab('streaming')">
                        <div class="home-feature-icon">🛡️</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">DST & Kicker Streaming</div>
                            <div class="home-feature-desc">Target turnover-prone offenses and high-implied-total dome matchups.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 3: What-If -->
                    <div class="home-feature-card" onclick="window.switchTab('whatif')">
                        <div class="home-feature-icon">🔮</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">What-If Schedule Simulator</div>
                            <div class="home-feature-desc">1,000 Monte Carlo schedule runs to isolate luck from true scoring talent.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 4: Newsletter -->
                    <div class="home-feature-card" onclick="window.switchTab('newsletter')">
                        <div class="home-feature-icon">📰</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Commish Roast & Discord</div>
                            <div class="home-feature-desc">AI Commissioner weekly dispatches, roasts & one-click Discord/Slack webhooks.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 5: Portfolio -->
                    <div class="home-feature-card" onclick="window.switchTab('portfolio')">
                        <div class="home-feature-icon">🌐</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Multi-League Portfolio</div>
                            <div class="home-feature-desc">Cross-league player exposure & conflicting matchup rooting interest radar.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 6: Lineup -->
                    <div class="home-feature-card" onclick="window.switchTab('lineup')">
                        <div class="home-feature-icon">🧠</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">AI Lineup Optimizer</div>
                            <div class="home-feature-desc">Start/sit decider, matchup difficulty grades & boom/bust simulations.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 7: Waiver -->
                    <div class="home-feature-card" onclick="window.switchTab('waiver')">
                        <div class="home-feature-icon">📡</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Waiver Wire Radar</div>
                            <div class="home-feature-desc">FAAB advisor, target share breakouts & unrostered snap risers.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 8: Playoff -->
                    <div class="home-feature-card" onclick="window.switchTab('playoff')">
                        <div class="home-feature-icon">🎲</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Playoff Machine</div>
                            <div class="home-feature-desc">10,000 Monte Carlo season simulations & championship title odds.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 9: Handcuffs -->
                    <div class="home-feature-card" onclick="window.switchTab('handcuff')">
                        <div class="home-feature-icon">🩹</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Handcuff Matrix</div>
                            <div class="home-feature-desc">Starter insurance scores & depth chart vulnerability tracking.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 10: Oracle -->
                    <div class="home-feature-card" onclick="window.switchTab('oracle')">
                        <div class="home-feature-icon">📊</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Power Rankings & Oracle</div>
                            <div class="home-feature-desc">True All-Play records, coaching efficiency & weekly recaps.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 11: Rivalry -->
                    <div class="home-feature-card" onclick="window.switchTab('rivalry')">
                        <div class="home-feature-icon">⚔️</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Rivalry Room</div>
                            <div class="home-feature-desc">All-time manager head-to-head records, blowouts & trophy room.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 12: Roster Depth -->
                    <div class="home-feature-card" onclick="window.switchTab('depth')">
                        <div class="home-feature-icon">📉</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Roster Depth Benchmark</div>
                            <div class="home-feature-desc">Positional power vs league median to spot trade surplus/deficit.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 13: Trades -->
                    <div class="home-feature-card" onclick="window.switchTab('trade')">
                        <div class="home-feature-icon">🔄</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Trade & Blockbuster Cycles</div>
                            <div class="home-feature-desc">Formulate 2-team trades and 3-team circular blockbuster cycles.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 14: Draft Assistant -->
                    <div class="home-feature-card" onclick="window.switchTab('draft')">
                        <div class="home-feature-icon">🎯</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Draft Command Center</div>
                            <div class="home-feature-desc">VORP recommendations, stack synergy & bye week conflict warnings.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 15: Matchups -->
                    <div class="home-feature-card" onclick="window.switchTab('matchups')">
                        <div class="home-feature-icon">⚔️</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Matchup Analyzer</div>
                            <div class="home-feature-desc">League-wide score projections, win probability & head-to-head metrics.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 16: Graph Network -->
                    <div class="home-feature-card" onclick="window.switchTab('graph')">
                        <div class="home-feature-icon">🕸️</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">Cytoscape Graph Map</div>
                            <div class="home-feature-desc">Visual interactive relationship canvas of teams, picks & rosters.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>

                    <!-- Tool 17: Setup -->
                    <div class="home-feature-card" onclick="window.switchTab('setup')">
                        <div class="home-feature-icon">⚙️</div>
                        <div class="home-feature-content">
                            <div class="home-feature-title">League Sync & Setup</div>
                            <div class="home-feature-desc">Manage Yahoo OAuth credentials, Sleeper imports and sync triggers.</div>
                        </div>
                        <div class="home-feature-arrow">→</div>
                    </div>
                </div>
            </div>

            <!-- Bottom Row: Mini Power Rankings & Oracle Story Teaser -->
            <div class="glass-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem">
                    <div style="display:flex; align-items:center; gap:0.5rem">
                        <span style="font-size:1.3rem">📊</span>
                        <h3 class="card-title" style="margin-bottom:0">League Power Snapshot & Standings</h3>
                    </div>
                    <button onclick="window.switchTab('oracle')" class="btn" style="padding:0.4rem 0.8rem; font-size:0.85rem">
                        View Full Power Rankings →
                    </button>
                </div>

                ${rankings.length > 0 ? `
                    <div style="overflow-x:auto">
                        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem">
                            <thead>
                                <tr style="border-bottom:2px solid var(--glass-border); color:var(--text-muted)">
                                    <th style="padding:0.6rem">Rank</th>
                                    <th style="padding:0.6rem">Team</th>
                                    <th style="padding:0.6rem">Actual Record</th>
                                    <th style="padding:0.6rem">True All-Play</th>
                                    <th style="padding:0.6rem">Points For</th>
                                    <th style="padding:0.6rem">Luck Rating</th>
                                    <th style="padding:0.6rem">Power Index</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rankings.slice(0, 5).map(r => `
                                    <tr style="border-bottom:1px solid var(--glass-border); ${r.is_user_team ? 'background:rgba(79,70,229,0.04); font-weight:700' : ''}">
                                        <td style="padding:0.6rem">
                                            <span style="font-weight:700; color:${r.rank === 1 ? 'var(--amber)' : 'var(--text-main)'}">#${r.rank}</span>
                                        </td>
                                        <td style="padding:0.6rem">
                                            <b>${r.name}</b> ${r.is_user_team ? '<span style="font-size:0.75rem; color:var(--primary)">(Your Team)</span>' : ''}
                                        </td>
                                        <td style="padding:0.6rem">${r.wins}-${r.losses}</td>
                                        <td style="padding:0.6rem; color:var(--text-muted)">${r.all_play_wins || r.wins * 3}-${r.all_play_losses || r.losses * 3}</td>
                                        <td style="padding:0.6rem">${r.points_for || 0}</td>
                                        <td style="padding:0.6rem">
                                            <span style="color:${(r.luck_index || 0) >= 0 ? 'var(--accent)' : 'var(--rose)'}">${(r.luck_index || 0) > 0 ? '+' : ''}${r.luck_index || 0}</span>
                                        </td>
                                        <td style="padding:0.6rem">
                                            <span style="font-weight:700; color:var(--primary)">${r.power_score || 85.0}</span>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div style="background:#f8fafc; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1rem; color:var(--text-muted); font-size:0.9rem">
                        🔮 ${oracleSummary}
                    </div>
                `}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `
            <div class="glass-card">
                <h2 class="card-title">⚠️ Dashboard Update</h2>
                <p style="color:var(--text-muted); margin-bottom:1rem">Could not load all dashboard widgets: ${e.message}</p>
                <div style="display:flex; gap:1rem">
                    <button onclick="window.loadHomeView()" class="btn">Retry</button>
                    <button onclick="window.switchTab('setup')" class="btn" style="background:#ffffff; color:var(--text-main); border:1px solid var(--glass-border)">Go to Setup</button>
                </div>
            </div>
        `;
    }
};

function renderHomeOnboarding(container) {
    container.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:3rem 2rem; margin-bottom:2rem; background:linear-gradient(135deg, rgba(79,70,229,0.06), rgba(16,185,129,0.04)); border:1px solid rgba(79,70,229,0.2)">
            <div class="brand-icon" style="width:64px; height:64px; font-size:2rem; margin:0 auto 1.5rem auto">🏈</div>
            <h1 style="font-size:2rem; font-weight:800; color:var(--text-main); margin-bottom:0.75rem">Welcome to Fantasy Sports Manager</h1>
            <p style="font-size:1.05rem; color:var(--text-muted); max-width:720px; margin:0 auto 2rem auto; line-height:1.6">
                Your AI & Graph Database command center. Connect your Yahoo or Sleeper fantasy football league to unlock mathematical lineup optimization, Monte Carlo playoff machine, waiver radar, and multi-team trade discovery.
            </p>

            <div class="grid-2" style="max-width:800px; margin:0 auto; text-align:left">
                <!-- Connect Yahoo Card -->
                <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1.5rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 12px rgba(0,0,0,0.04)">
                    <div>
                        <div style="font-size:1.5rem; margin-bottom:0.5rem">🔑</div>
                        <h3 style="font-weight:700; font-size:1.15rem; color:var(--text-main); margin-bottom:0.4rem">Yahoo Fantasy Football</h3>
                        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1.25rem">
                            Connect securely via Yahoo OAuth 2.0 to sync full rosters, historical matchups, scoring settings, and player headshots.
                        </p>
                    </div>
                    <button onclick="window.switchTab('setup')" class="btn" style="width:100%; justify-content:center">
                        Setup Yahoo OAuth →
                    </button>
                </div>

                <!-- Connect Sleeper Card -->
                <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1.5rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 12px rgba(0,0,0,0.04)">
                    <div>
                        <div style="font-size:1.5rem; margin-bottom:0.5rem">🌐</div>
                        <h3 style="font-weight:700; font-size:1.15rem; color:var(--text-main); margin-bottom:0.4rem">Sleeper League Import</h3>
                        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1.25rem">
                            No credentials required! Simply enter any public Sleeper username to instantly ingest rosters and draft picks.
                        </p>
                    </div>
                    <button onclick="window.switchTab('setup')" class="btn btn-accent" style="width:100%; justify-content:center">
                        Import Sleeper League →
                    </button>
                </div>
            </div>
        </div>

        <!-- Preview of Features Grid -->
        <div class="glass-card">
            <h3 class="card-title" style="margin-bottom:1rem">✨ What's Inside Fantasy Sports Manager</h3>
            <div class="home-features-grid">
                <div class="home-feature-card" onclick="window.switchTab('lineup')">
                    <div class="home-feature-icon">🧠</div>
                    <div class="home-feature-content">
                        <div class="home-feature-title">AI Lineup Optimizer</div>
                        <div class="home-feature-desc">Monte Carlo simulations, floor/ceiling projections, and start/sit decider.</div>
                    </div>
                    <div class="home-feature-arrow">→</div>
                </div>
                <div class="home-feature-card" onclick="window.switchTab('waiver')">
                    <div class="home-feature-icon">📡</div>
                    <div class="home-feature-content">
                        <div class="home-feature-title">Waiver Wire Radar</div>
                        <div class="home-feature-desc">Tracks target share spikes and calculates optimal FAAB bidding ranges.</div>
                    </div>
                    <div class="home-feature-arrow">→</div>
                </div>
                <div class="home-feature-card" onclick="window.switchTab('playoff')">
                    <div class="home-feature-icon">🎲</div>
                    <div class="home-feature-content">
                        <div class="home-feature-title">10k-Run Playoff Machine</div>
                        <div class="home-feature-desc">Simulates the remaining season 10,000 times to project title odds.</div>
                    </div>
                    <div class="home-feature-arrow">→</div>
                </div>
                <div class="home-feature-card" onclick="window.switchTab('handcuff')">
                    <div class="home-feature-icon">🩹</div>
                    <div class="home-feature-content">
                        <div class="home-feature-title">Handcuff Insurance</div>
                        <div class="home-feature-desc">Maps depth charts and scores your vulnerability to backfield injuries.</div>
                    </div>
                    <div class="home-feature-arrow">→</div>
                </div>
            </div>
        </div>
    `;
}

// Quick sync helper from home
window.quickSyncCurrentLeague = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey");
    if (!leagueKey) {
        window.switchTab("setup");
        return;
    }
    const btn = document.getElementById("btn-home-quicksync");
    if (btn) {
        btn.innerText = "Syncing...";
        btn.disabled = true;
    }

    try {
        if (leagueKey.startsWith("sleeper_")) {
            const sleeperLeagueId = leagueKey.replace("sleeper_", "");
            const res = await fetch(`/api/sleeper/sync/${sleeperLeagueId}`, { method: "POST" });
            const data = await res.json();
            alert(data.message || "Synced Sleeper league successfully!");
        } else {
            const res = await fetch(`/api/league/sync/${leagueKey}`, { method: "POST" });
            const data = await res.json();
            alert(data.message || "Synced Yahoo league successfully!");
        }
        window.loadHomeView();
    } catch (e) {
        alert("Sync error: " + e.message);
    } finally {
        if (btn) {
            btn.innerText = "⚡ Quick Sync DB";
            btn.disabled = false;
        }
    }
};
