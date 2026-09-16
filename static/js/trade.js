// Trade Synergy Finder & 3-Team Blockbuster Cycle Detector

let activeTradeMode = "blockbuster"; // '2team' or 'blockbuster'

window.loadTradeView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey") || "sample";
    const container = document.getElementById("trade-proposals-container");
    if (!container) return;

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem">
            <div style="display:flex; gap:0.5rem; background:#f1f5f9; padding:0.3rem; border-radius:8px">
                <button id="btn-trade-blockbuster" class="btn" style="padding:0.4rem 0.9rem; font-size:0.85rem; ${activeTradeMode === 'blockbuster' ? 'background:var(--primary); color:#fff' : 'background:transparent; color:var(--text-muted); box-shadow:none'}">⚡ 3-Team Blockbuster Cycles</button>
                <button id="btn-trade-2team" class="btn" style="padding:0.4rem 0.9rem; font-size:0.85rem; ${activeTradeMode === '2team' ? 'background:var(--primary); color:#fff' : 'background:transparent; color:var(--text-muted); box-shadow:none'}">🤝 Standard 2-Team Trades</button>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted)">
                Graph-traversed proposals matching surplus/deficit depth
            </div>
        </div>
        <div id="trade-results-list"><div style="color:var(--text-muted)">Analyzing graph paths for trade synergies...</div></div>
    `;

    document.getElementById("btn-trade-blockbuster")?.addEventListener("click", () => {
        activeTradeMode = "blockbuster";
        window.loadTradeView();
    });
    document.getElementById("btn-trade-2team")?.addEventListener("click", () => {
        activeTradeMode = "2team";
        window.loadTradeView();
    });

    const listContainer = document.getElementById("trade-results-list");

    if (activeTradeMode === "blockbuster") {
        await loadBlockbusterTrades(leagueKey, listContainer);
    } else {
        await load2TeamTrades(leagueKey, listContainer);
    }
};

async function loadBlockbusterTrades(leagueKey, container) {
    try {
        const res = await fetch(`/api/trade/blockbuster?league_key=${leagueKey}`);
        const data = await res.json();
        const proposals = data.proposals || [];

        if (proposals.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted)">No 3-way circular trade cycles discovered. Sync your league to populate rosters!</div>';
            return;
        }

        container.innerHTML = "";
        proposals.forEach(p => {
            const card = document.createElement("div");
            card.className = "glass-card";
            card.style.marginBottom = "1.25rem";
            card.style.border = "1px solid rgba(79, 70, 229, 0.2)";

            const cycleHtml = (p.cycle_breakdown || []).map((step, idx) => `
                <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:8px; padding:1rem; position:relative; box-shadow:0 1px 3px rgba(0,0,0,0.03)">
                    <div style="font-size:0.75rem; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:0.4rem">
                        Transfer ${idx + 1}
                    </div>
                    <div style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-bottom:0.2rem">
                        ${step.from_team} ➔ ${step.to_team}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.6rem">
                        ${step.headshot_url ? `<img src="${window.getPlayerHeadshot ? window.getPlayerHeadshot(step.headshot_url) : step.headshot_url}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #cbd5e1" onerror="this.onerror=null; this.src=window.DEFAULT_HEADSHOT;">` : ''}
                        <div>
                            <div style="font-weight:700; font-size:0.95rem">${step.player} <span class="pos-badge pos-${step.position}">${step.position}</span></div>
                            <div style="font-size:0.78rem; color:var(--text-muted)">${step.nfl_team} • ${step.solves_need}</div>
                        </div>
                    </div>
                </div>
            `).join("");

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem">
                    <div>
                        <div style="font-weight:800; font-size:1.15rem; color:var(--text-main)">${p.title}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted)">Circular 3-Way Graph Match • Resolves Deadlocks</div>
                    </div>
                    <span style="background:rgba(16,185,129,0.12); color:#059669; font-size:0.85rem; font-weight:700; padding:0.35rem 0.75rem; border-radius:6px">
                        ${p.fairness_score}% Fairness Index
                    </span>
                </div>

                <div class="grid-3" style="margin-bottom:1rem; gap:0.75rem">
                    ${cycleHtml}
                </div>

                <div style="background:rgba(79, 70, 229, 0.04); border:1px solid rgba(79, 70, 229, 0.12); border-radius:8px; padding:0.85rem; margin-bottom:0.75rem">
                    <div style="font-size:0.82rem; font-weight:700; color:var(--primary); margin-bottom:0.4rem">💡 GRAPH CYCLE RATIONALE:</div>
                    <div style="font-size:0.88rem; color:var(--text-main); line-height:1.4">${p.synergy_rationale}</div>
                </div>

                <div style="display:flex; gap:1rem; font-size:0.82rem; color:var(--text-muted); flex-wrap:wrap">
                    ${Object.entries(p.team_impact || {}).map(([team, impact]) => `
                        <span><b>${team}</b>: <span style="color:var(--accent); font-weight:700">${impact.net_ppg}</span> (${impact.verdict})</span>
                    `).join(" • ")}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading blockbuster trades: ${e.message}</div>`;
    }
}

async function load2TeamTrades(leagueKey, container) {
    try {
        const res = await fetch(`/api/trade/synergies?league_key=${leagueKey}&user_team_key=${leagueKey}.t.1`);
        const data = await res.json();
        const proposals = data.proposals || [];

        if (proposals.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted)">No 2-team trade synergies detected. Sync your league graph to update rosters!</div>';
            return;
        }

        container.innerHTML = "";
        proposals.forEach(p => {
            const card = document.createElement("div");
            card.className = "glass-card";
            card.style.marginBottom = "1rem";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                    <div style="font-weight:700; font-size:1.1rem; color:var(--text-main)">Trade Partner: ${p.partner_name} (${p.partner_manager})</div>
                    <span style="background:rgba(16,185,129,0.12); color:#059669; font-size:0.8rem; font-weight:700; padding:0.3rem 0.6rem; border-radius:6px">
                        ${p.trade_fairness_score}% Synergy Match
                    </span>
                </div>
                
                <div class="grid-2" style="margin-bottom:1rem">
                    <div style="background:#f8fafc; border:1px solid var(--glass-border); padding:0.75rem; border-radius:8px">
                        <div style="font-size:0.8rem; color:var(--accent); font-weight:700; margin-bottom:0.5rem">YOU RECEIVE:</div>
                        ${(p.receive_players || []).map(pl => `
                            <div style="font-weight:600; color:var(--text-main); margin-bottom:0.2rem">${pl.name} <span class="pos-badge pos-${pl.position}" style="margin-left:0.25rem">${pl.position}</span></div>
                        `).join("")}
                    </div>
                    <div style="background:#f8fafc; border:1px solid var(--glass-border); padding:0.75rem; border-radius:8px">
                        <div style="font-size:0.8rem; color:var(--rose); font-weight:700; margin-bottom:0.5rem">YOU GIVE:</div>
                        ${(p.give_players || []).map(pl => `
                            <div style="font-weight:600; color:var(--text-main); margin-bottom:0.2rem">${pl.name} <span class="pos-badge pos-${pl.position}" style="margin-left:0.25rem">${pl.position}</span></div>
                        `).join("")}
                    </div>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted)">💡 <i>${p.synergy_reason}</i></div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading 2-team trade suggestions: ${e.message}</div>`;
    }
}
