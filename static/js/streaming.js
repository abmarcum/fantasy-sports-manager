// Defense (DST) & Kicker Matchup Streaming Exploiter

window.loadStreamingView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey") || "sample";
    const container = document.getElementById("streaming-content-container");
    if (!container) return;

    container.innerHTML = '<div style="color:var(--text-muted)">Scanning waiver wire defenses and kickers against opponent turnover and pressure metrics...</div>';

    try {
        const res = await fetch(`/api/streaming/recommendations?league_key=${leagueKey}`);
        const data = await res.json();

        container.innerHTML = "";

        const dstList = data.dst_streamers || [];
        const kickerList = data.kicker_streamers || [];

        // 1. Philosophy Banner
        const bannerCard = document.createElement("div");
        bannerCard.className = "glass-card";
        bannerCard.style.marginBottom = "1.5rem";
        bannerCard.style.background = "linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(2,132,199,0.06) 100%)";
        bannerCard.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.75rem">
                <span style="font-size:1.8rem">🛡️</span>
                <div>
                    <div style="font-size:1.15rem; font-weight:800; color:var(--text-main)">The Streaming Edge: Zero-Capital Positional Dominance</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.4">${data.streaming_philosophy}</div>
                </div>
            </div>
        `;
        container.appendChild(bannerCard);

        // 2. DST Streaming Cards Grid
        const dstSection = document.createElement("div");
        dstSection.className = "glass-card";
        dstSection.style.marginBottom = "1.5rem";
        dstSection.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem">
                <div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--text-main)">🎯 Top Week Defense (DST) Streaming Targets</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Cross-referenced with sacks allowed, turnover rates, and sub-20 Vegas implied totals</div>
                </div>
            </div>

            <div class="grid-2" style="gap:1rem">
                ${dstList.map(dst => `
                    <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:10px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.03)">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem">
                            <div>
                                <span style="font-weight:800; font-size:1.1rem; color:var(--text-main)">${dst.name}</span>
                                <span class="pos-badge pos-DEF" style="margin-left:0.3rem">DEF</span>
                            </div>
                            <span style="font-size:0.85rem; font-weight:800; padding:0.25rem 0.6rem; border-radius:6px; ${
                                dst.grade.startsWith('A') ? 'background:rgba(16,185,129,0.12); color:#059669' :
                                'background:rgba(79,70,229,0.1); color:var(--primary)'
                            }">
                                Grade: ${dst.grade}
                            </span>
                        </div>

                        <!-- Matchup & Vegas Statline -->
                        <div style="display:flex; gap:0.6rem; margin-bottom:0.75rem; flex-wrap:wrap; font-size:0.82rem">
                            <span style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.25rem 0.5rem">
                                Opponent: <b>${dst.home ? 'vs' : '@'} ${dst.opp}</b>
                            </span>
                            <span style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.25rem 0.5rem">
                                Opp Implied Total: <b style="color:var(--rose)">${dst.opp_itt} pts</b>
                            </span>
                            <span style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.25rem 0.5rem">
                                Proj: <b style="color:var(--accent)">${dst.proj} pts</b>
                            </span>
                            <span style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); color:#059669; border-radius:6px; padding:0.25rem 0.5rem; font-weight:700">
                                Suggested FAAB: $${dst.faab}
                            </span>
                        </div>

                        <div style="font-size:0.84rem; color:var(--text-muted); line-height:1.4">
                            💡 ${dst.rationale}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
        container.appendChild(dstSection);

        // 3. Kicker Streaming Cards Grid
        const kSection = document.createElement("div");
        kSection.className = "glass-card";
        kSection.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem">
                <div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--text-main)">🦵 High-Floor Kicker Streaming Radar</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Selected by climate-controlled dome status, high team implied totals, and red-zone stall rates</div>
                </div>
            </div>

            <div class="grid-3" style="gap:1rem">
                ${kickerList.map(k => `
                    <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:10px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.03)">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem">
                            <div>
                                <span style="font-weight:800; font-size:1.05rem; color:var(--text-main)">${k.player}</span>
                                <span class="pos-badge pos-K" style="margin-left:0.3rem">K</span>
                            </div>
                            <span style="font-size:0.85rem; font-weight:800; padding:0.2rem 0.5rem; border-radius:6px; background:rgba(16,185,129,0.12); color:#059669">
                                ${k.grade}
                            </span>
                        </div>

                        <div style="display:flex; gap:0.4rem; margin-bottom:0.75rem; flex-wrap:wrap; font-size:0.8rem">
                            <span style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:0.2rem 0.4rem">
                                ${k.team} vs ${k.opp} ${k.dome ? '🏟️ (Dome)' : '🌤️'}
                            </span>
                            <span style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:0.2rem 0.4rem">
                                Team ITT: <b style="color:var(--primary)">${k.team_itt}</b>
                            </span>
                            <span style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:0.2rem 0.4rem">
                                RZ Stall: <b>${k.rz_stall_pct}</b>
                            </span>
                        </div>

                        <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.4">
                            💡 ${k.rationale}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
        container.appendChild(kSection);

    } catch (e) {
        container.innerHTML = `<div style="color:var(--rose)">Error loading streaming recommendations: ${e.message}</div>`;
    }
};
