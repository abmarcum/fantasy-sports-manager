// AI League Commissioner Newsletter & Webhook Broadcast Controller

let currentNewsletterTone = "roast";
let currentNewsletterData = null;

window.loadNewsletterView = async function() {
    const leagueKey = localStorage.getItem("selectedLeagueKey") || "sample";
    const container = document.getElementById("newsletter-content-container");
    if (!container) return;

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem">
            <!-- Tone Presets -->
            <div style="display:flex; gap:0.5rem; background:#f1f5f9; padding:0.3rem; border-radius:8px">
                <button id="btn-tone-roast" class="btn" style="padding:0.4rem 0.8rem; font-size:0.85rem; ${currentNewsletterTone === 'roast' ? 'background:var(--primary); color:#fff' : 'background:transparent; color:var(--text-muted); box-shadow:none'}">🔥 Savage Roast</button>
                <button id="btn-tone-analyst" class="btn" style="padding:0.4rem 0.8rem; font-size:0.85rem; ${currentNewsletterTone === 'analyst' ? 'background:var(--primary); color:#fff' : 'background:transparent; color:var(--text-muted); box-shadow:none'}">📊 ESPN Analyst</button>
                <button id="btn-tone-hype" class="btn" style="padding:0.4rem 0.8rem; font-size:0.85rem; ${currentNewsletterTone === 'hype' ? 'background:var(--primary); color:#fff' : 'background:transparent; color:var(--text-muted); box-shadow:none'}">⚡ Hype Man</button>
            </div>

            <!-- Webhook Broadcast Trigger -->
            <div style="display:flex; gap:0.5rem; align-items:center">
                <button id="btn-open-webhook-modal" class="btn btn-accent" style="padding:0.45rem 1rem; font-size:0.85rem">
                    📢 Post to Discord / Slack
                </button>
            </div>
        </div>

        <div id="newsletter-body-container">
            <div style="color:var(--text-muted)">Crafting AI Commissioner dispatch...</div>
        </div>
    `;

    document.getElementById("btn-tone-roast")?.addEventListener("click", () => {
        currentNewsletterTone = "roast";
        fetchAndRenderNewsletter(leagueKey);
    });
    document.getElementById("btn-tone-analyst")?.addEventListener("click", () => {
        currentNewsletterTone = "analyst";
        fetchAndRenderNewsletter(leagueKey);
    });
    document.getElementById("btn-tone-hype")?.addEventListener("click", () => {
        currentNewsletterTone = "hype";
        fetchAndRenderNewsletter(leagueKey);
    });

    document.getElementById("btn-open-webhook-modal")?.addEventListener("click", openWebhookModal);

    await fetchAndRenderNewsletter(leagueKey);
};

async function fetchAndRenderNewsletter(leagueKey) {
    const bodyContainer = document.getElementById("newsletter-body-container");
    if (!bodyContainer) return;

    bodyContainer.innerHTML = '<div style="color:var(--text-muted)">Generating weekly recap and calculating bench blunder awards...</div>';

    try {
        const res = await fetch(`/api/newsletter/generate?league_key=${leagueKey}&tone=${currentNewsletterTone}&week=1`);
        const data = await res.json();
        currentNewsletterData = data;

        bodyContainer.innerHTML = `
            <!-- Commissioner Editorial Header -->
            <div class="glass-card" style="margin-bottom:1.5rem; border-left:4px solid var(--primary)">
                <div style="font-size:1.3rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem">${data.headline}</div>
                <div style="font-size:0.82rem; color:var(--text-dim); margin-bottom:1rem">${data.league_name} • Official AI Commissioner Dispatch</div>
                <div style="font-size:0.95rem; color:var(--text-main); line-height:1.6; background:#f8fafc; border-radius:8px; padding:1rem; border:1px solid #e2e8f0">
                    "${data.editorial}"
                </div>
            </div>

            <!-- Weekly Superlatives & Awards -->
            <div class="glass-card" style="margin-bottom:1.5rem">
                <div style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem">🏆 Weekly Superlative Honors & Roasts</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem">Standout performances, high scores, and coaching blunders</div>
                
                <div class="grid-3" style="gap:1rem">
                    ${(data.awards || []).map(a => `
                        <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:10px; padding:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.03)">
                            <div style="font-size:1.8rem; margin-bottom:0.4rem">${a.icon}</div>
                            <div style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-bottom:0.2rem">${a.title}</div>
                            <div style="font-size:0.85rem; font-weight:700; color:var(--primary); margin-bottom:0.4rem">${a.recipient} <span style="font-size:0.75rem; color:var(--text-muted)">(${a.team})</span></div>
                            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4">${a.blurb}</div>
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- Matchup Recaps Grid -->
            <div class="glass-card" style="margin-bottom:1.5rem">
                <div style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem">⚔️ Matchup Post-Mortems</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem">Turning points, point margins, and blowouts</div>

                <div class="grid-2" style="gap:1rem">
                    ${(data.matchup_recaps || []).map(m => `
                        <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:10px; padding:1rem">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem">
                                <span style="font-weight:700; font-size:0.95rem; color:var(--text-main)">${m.title}</span>
                                <span style="font-size:0.75rem; font-weight:700; background:#f1f5f9; padding:0.2rem 0.5rem; border-radius:4px; color:var(--text-muted)">
                                    ${m.diff} pt differential
                                </span>
                            </div>
                            <div style="font-size:0.84rem; color:var(--text-muted); line-height:1.4">${m.commentary}</div>
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- Next Week Game of the Week -->
            <div class="glass-card" style="background:linear-gradient(135deg, rgba(79,70,229,0.05) 0%, rgba(16,185,129,0.05) 100%)">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem">
                    <div>
                        <div style="font-size:0.8rem; font-weight:700; color:var(--primary); text-transform:uppercase">🔮 Next Week's Marquee Matchup</div>
                        <div style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0.2rem 0">${data.lookahead?.game_of_the_week || 'Marquee Matchup'}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted)">${data.lookahead?.hype_text || ''}</div>
                    </div>
                    <button class="btn" onclick="window.switchTab('matchups')" style="padding:0.4rem 0.8rem; font-size:0.8rem">Inspect Matchup ➔</button>
                </div>
            </div>
        `;
    } catch (e) {
        bodyContainer.innerHTML = `<div style="color:var(--rose)">Error generating newsletter: ${e.message}</div>`;
    }
}

function openWebhookModal() {
    const savedUrl = localStorage.getItem("leagueWebhookUrl") || "";

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.id = "webhook-modal-overlay";
    overlay.innerHTML = `
        <div class="modal-container" style="max-width:550px">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                <div style="font-size:1.2rem; font-weight:800; color:var(--text-main)">📢 League Webhook Dispatcher</div>
                <button id="btn-close-webhook-modal" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-dim)">✕</button>
            </div>

            <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem">
                Broadcast this AI Commissioner Dispatch, weekly power rankings, or waiver updates directly to your Discord or Slack channel.
            </p>

            <div style="margin-bottom:1rem">
                <label style="font-size:0.82rem; font-weight:700; color:var(--text-main); display:block; margin-bottom:0.4rem">Webhook URL</label>
                <input type="text" id="input-webhook-url" class="input-field" placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..." value="${savedUrl}">
                <div style="font-size:0.75rem; color:var(--text-dim)">Discord and Slack incoming webhooks are automatically detected.</div>
            </div>

            <div style="display:flex; gap:0.6rem; justify-content:flex-end; margin-top:1.5rem">
                <button id="btn-test-webhook" class="btn" style="padding:0.5rem 1rem; font-size:0.85rem">🔔 Send Test Ping</button>
                <button id="btn-send-newsletter" class="btn btn-accent" style="padding:0.5rem 1.2rem; font-size:0.85rem">🚀 Broadcast Newsletter</button>
            </div>
            <div id="webhook-toast-msg" style="margin-top:0.75rem; font-size:0.82rem; display:none"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("btn-close-webhook-modal")?.addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.getElementById("btn-test-webhook")?.addEventListener("click", async () => {
        const url = document.getElementById("input-webhook-url").value.trim();
        if (!url) return alert("Please enter a webhook URL");
        localStorage.setItem("leagueWebhookUrl", url);
        showToast("Sending test ping...", "#64748b");

        try {
            const res = await fetch("/api/newsletter/broadcast", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({webhook_url: url, payload_type: "test_ping"})
            });
            const data = await res.json();
            if (data.status === "success") {
                showToast(`✅ Test ping delivered to ${data.platform}!`, "#059669");
            } else {
                showToast(`❌ Failed: ${data.message}`, "#e11d48");
            }
        } catch (e) {
            showToast(`❌ Error: ${e.message}`, "#e11d48");
        }
    });

    document.getElementById("btn-send-newsletter")?.addEventListener("click", async () => {
        const url = document.getElementById("input-webhook-url").value.trim();
        if (!url) return alert("Please enter a webhook URL");
        localStorage.setItem("leagueWebhookUrl", url);
        showToast("Broadcasting weekly dispatch...", "#64748b");

        try {
            const res = await fetch("/api/newsletter/broadcast", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    webhook_url: url,
                    payload_type: "newsletter",
                    data: currentNewsletterData || {}
                })
            });
            const data = await res.json();
            if (data.status === "success") {
                showToast(`🎉 Newsletter successfully posted to ${data.platform}!`, "#059669");
                setTimeout(() => overlay.remove(), 1600);
            } else {
                showToast(`❌ Broadcast failed: ${data.message}`, "#e11d48");
            }
        } catch (e) {
            showToast(`❌ Error: ${e.message}`, "#e11d48");
        }
    });

    function showToast(msg, color) {
        const el = document.getElementById("webhook-toast-msg");
        if (el) {
            el.style.display = "block";
            el.style.color = color;
            el.innerText = msg;
        }
    }
}
