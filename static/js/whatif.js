// 1,000-Permutation 'What-If' Alternate Universe Schedule Re-Randomizer

window.loadWhatIfView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey") || "sample";
    const container = document.getElementById("whatif-content-container");
    if (!container) return;

    container.innerHTML = '<div style="color:var(--text-muted)">Running 1,000 Monte Carlo schedule re-randomizations to isolate schedule luck...</div>';

    try {
        const res = await fetch(`/api/whatif/simulate?league_key=${leagueKey}&simulations=1000`);
        const data = await res.json();

        container.innerHTML = "";

        const luckiest = data.luckiest_manager || {};
        const unluckiest = data.unluckiest_manager || {};
        const standings = data.standings_comparison || [];

        // 1. Header & Re-run Trigger
        const headerCard = document.createElement("div");
        headerCard.className = "glass-card";
        headerCard.style.marginBottom = "1.5rem";
        headerCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem">
                <div>
                    <div style="font-size:1.25rem; font-weight:800; color:var(--text-main)">🔮 What-If 1,000-Run Alternate Universe Simulator</div>
                    <div style="font-size:0.82rem; color:var(--text-muted)">
                        Re-simulates the entire season across 1,000 randomized round-robin schedules to calculate your team's true expected win total without schedule luck.
                    </div>
                </div>
                <button id="btn-resimulate-whatif" class="btn btn-accent" style="padding:0.5rem 1rem; font-size:0.85rem">
                    🎲 Re-Simulate 1,000 Permutations
                </button>
            </div>
        `;
        container.appendChild(headerCard);

        document.getElementById("btn-resimulate-whatif")?.addEventListener("click", () => {
            window.loadWhatIfView();
        });

        // 2. Luck Extreme Spotlights
        const spotlights = document.createElement("div");
        spotlights.className = "grid-2";
        spotlights.style.marginBottom = "1.5rem";
        spotlights.innerHTML = `
            <!-- Luckiest Manager -->
            <div class="glass-card" style="margin-bottom:0; border-left:4px solid #10b981; background:linear-gradient(180deg, #ffffff 0%, rgba(16,185,129,0.03) 100%)">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem">
                    <span style="font-size:0.8rem; font-weight:700; color:#059669; text-transform:uppercase">🍀 Most Blessed by the Schedule</span>
                    <span style="background:rgba(16,185,129,0.12); color:#059669; font-weight:800; font-size:0.85rem; padding:0.2rem 0.6rem; border-radius:6px">
                        +${luckiest.luck_diff} Wins Above Expected
                    </span>
                </div>
                <div style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin-bottom:0.3rem">${luckiest.name} <span style="font-size:0.9rem; color:var(--text-muted)">(${luckiest.manager})</span></div>
                <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.4">${luckiest.blurb}</div>
            </div>

            <!-- Most Cursed Manager -->
            <div class="glass-card" style="margin-bottom:0; border-left:4px solid #e11d48; background:linear-gradient(180deg, #ffffff 0%, rgba(225,29,72,0.03) 100%)">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--rose); text-transform:uppercase">💀 Most Cursed by Schedule Buzzsaws</span>
                    <span style="background:rgba(225,29,72,0.1); color:var(--rose); font-weight:800; font-size:0.85rem; padding:0.2rem 0.6rem; border-radius:6px">
                        ${unluckiest.luck_diff} Wins Below Expected
                    </span>
                </div>
                <div style="font-size:1.2rem; font-weight:800; color:var(--text-main); margin-bottom:0.3rem">${unluckiest.name} <span style="font-size:0.9rem; color:var(--text-muted)">(${unluckiest.manager})</span></div>
                <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.4">${unluckiest.blurb}</div>
            </div>
        `;
        container.appendChild(spotlights);

        // 3. Alternate Universe Standings Table
        const tableCard = document.createElement("div");
        tableCard.className = "glass-card";
        tableCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem">
                <div>
                    <div style="font-size:1.15rem; font-weight:800; color:var(--text-main)">📊 True Talent Standings (Neutral Schedule Universe)</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Teams ordered by True Expected Wins over 1,000 schedule simulations</div>
                </div>
            </div>

            <div style="overflow-x:auto">
                <table style="width:100%; border-collapse:collapse; font-size:0.88rem">
                    <thead>
                        <tr style="border-bottom:2px solid var(--glass-border); text-align:left; color:var(--text-muted); font-size:0.78rem">
                            <th style="padding:0.75rem">TRUE RANK</th>
                            <th style="padding:0.75rem">TEAM & MANAGER</th>
                            <th style="padding:0.75rem">ACTUAL RECORD</th>
                            <th style="padding:0.75rem">EXPECTED WINS (MEDIAN)</th>
                            <th style="padding:0.75rem">5TH - 95TH %ILE RANGE</th>
                            <th style="padding:0.75rem">SCHEDULE LUCK (Δ WINS)</th>
                            <th style="padding:0.75rem">VERDICT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map(t => `
                            <tr style="border-bottom:1px solid var(--glass-border); background:#ffffff">
                                <td style="padding:0.75rem; font-weight:800; font-family:var(--font-mono); color:var(--primary)">
                                    #${t.expected_rank}
                                </td>
                                <td style="padding:0.75rem; font-weight:700; color:var(--text-main)">
                                    ${t.name} <span style="font-size:0.75rem; color:var(--text-muted)">(${t.manager})</span>
                                </td>
                                <td style="padding:0.75rem; font-weight:700; font-family:var(--font-mono)">
                                    ${t.actual_wins}-${t.actual_losses}
                                </td>
                                <td style="padding:0.75rem; font-weight:800; font-family:var(--font-mono); color:var(--primary)">
                                    ${t.expected_wins} W
                                </td>
                                <td style="padding:0.75rem; font-family:var(--font-mono); color:var(--text-muted)">
                                    ${t.win_range_p05_p95} W
                                </td>
                                <td style="padding:0.75rem; font-weight:800; font-family:var(--font-mono); color:${t.luck_differential >= 1.0 ? '#059669' : (t.luck_differential <= -1.0 ? '#e11d48' : 'var(--text-main)')}">
                                    ${t.luck_differential > 0 ? '+' : ''}${t.luck_differential} W
                                </td>
                                <td style="padding:0.75rem">
                                    <span style="font-size:0.75rem; font-weight:800; padding:0.2rem 0.5rem; border-radius:4px; ${
                                        t.luck_badge.includes('BLESSED') ? 'background:rgba(16,185,129,0.12); color:#059669' :
                                        (t.luck_badge.includes('CURSED') ? 'background:rgba(225,29,72,0.1); color:var(--rose)' :
                                        'background:#f1f5f9; color:var(--text-muted)')
                                    }">
                                        ${t.luck_badge}
                                    </span>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(tableCard);

    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error running What-If simulation: ${e.message}</div>`;
    }
};
