// Main App Routing, Auth, League Synchronization
let currentLeagueKey = localStorage.getItem("selectedLeagueKey") || "";
let currentTeamKey = localStorage.getItem("selectedTeamKey") || "";

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    handleAuthQueryParams();
    checkAuthStatus();
    loadLeagues();
    initSleeperSync();
    
    // Bind buttons
    document.getElementById("btn-save-credentials")?.addEventListener("click", saveCredentials);
    document.getElementById("btn-sync-league")?.addEventListener("click", syncLeague);
    document.getElementById("btn-yahoo-login")?.addEventListener("click", startYahooLogin);
    document.getElementById("btn-header-login")?.addEventListener("click", startYahooLogin);
    document.getElementById("btn-header-logout")?.addEventListener("click", logoutYahoo);
    
    // Toggle manual credentials inputs
    document.getElementById("btn-toggle-manual-creds")?.addEventListener("click", () => {
        const manualForm = document.getElementById("manual-credentials-form");
        const toggleBtn = document.getElementById("btn-toggle-manual-creds");
        if (manualForm) {
            const isHidden = manualForm.style.display === "none";
            manualForm.style.display = isHidden ? "block" : "none";
            if (toggleBtn) {
                toggleBtn.innerText = isHidden ? "Hide Manual Inputs" : "Show Manual Inputs";
            }
        }
    });
});

function handleAuthQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("auth_success")) {
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("🎉 Successfully authenticated with Yahoo OAuth 2.0!");
    } else if (urlParams.has("auth_error")) {
        const errorMsg = urlParams.get("auth_error");
        window.history.replaceState({}, document.title, window.location.pathname);
        alert(`❌ Yahoo Authentication Error: ${errorMsg}`);
    }
}

function initTabs() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const target = tab.dataset.tab;
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            document.getElementById(`tab-${target}`).classList.add("active");
            
            // Trigger tab specific logic
            if (target === "lineup") window.loadLineupView?.();
            if (target === "waiver") window.loadWaiverView?.();
            if (target === "playoff") window.loadPlayoffView?.();
            if (target === "handcuff") window.loadHandcuffView?.();
            if (target === "oracle") window.loadOracleView?.();
            if (target === "rivalry") window.loadRivalryView?.();
            if (target === "depth") window.loadRosterDepthView?.();
            if (target === "draft") window.loadDraftView?.();
            if (target === "matchups") window.loadMatchupsView?.();
            if (target === "trade") window.loadTradeView?.();
            if (target === "graph") window.initCytoscapeGraph?.();
        });
    });
}

async function checkAuthStatus() {
    try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        
        const badge = document.getElementById("auth-status-badge");
        const headerLoginBtn = document.getElementById("btn-header-login");
        const headerLogoutBtn = document.getElementById("btn-header-logout");

        if (data.authenticated) {
            if (badge) {
                badge.classList.add("authenticated");
                badge.innerText = "🟢 Yahoo Connected";
            }
            if (headerLoginBtn) headerLoginBtn.style.display = "none";
            if (headerLogoutBtn) headerLogoutBtn.style.display = "flex";
        } else {
            if (badge) {
                badge.classList.remove("authenticated");
                badge.innerText = "Not Authenticated";
            }
            if (headerLoginBtn) headerLoginBtn.style.display = "inline-flex";
            if (headerLogoutBtn) headerLogoutBtn.style.display = "none";
        }

        const envBanner = document.getElementById("env-credentials-banner");
        const manualForm = document.getElementById("manual-credentials-form");
        const toggleBtn = document.getElementById("btn-toggle-manual-creds");

        // Hide credentials input fields if configured via .env
        if (data.env_configured) {
            if (envBanner) envBanner.style.display = "block";
            if (manualForm) manualForm.style.display = "none";
            if (toggleBtn) toggleBtn.innerText = "Show Manual Inputs";
        } else {
            if (envBanner) envBanner.style.display = "none";
            if (manualForm) manualForm.style.display = "block";

            // Auto-populate credentials if manually saved
            if (data.client_id) {
                const clientInput = document.getElementById("input-client-id");
                if (clientInput && !clientInput.value) {
                    clientInput.value = data.client_id;
                }
            }
        }
        
        // Display effective Redirect URI helper
        const uriDisplay = document.getElementById("display-redirect-uri");
        if (uriDisplay && data.redirect_uri) {
            uriDisplay.innerText = data.redirect_uri;
        }
    } catch (e) {
        console.error("Auth status error:", e);
    }
}

async function logoutYahoo() {
    if (!confirm("Are you sure you want to disconnect from Yahoo OAuth?")) return;
    try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        const data = await res.json();
        localStorage.removeItem("selectedLeagueKey");
        localStorage.removeItem("selectedTeamKey");
        currentLeagueKey = "";
        currentTeamKey = "";
        checkAuthStatus();
        loadLeagues();
        alert(data.message || "Disconnected from Yahoo OAuth.");
    } catch (e) {
        console.error("Logout error:", e);
    }
}

async function saveCredentials() {
    const clientId = document.getElementById("input-client-id").value;
    const clientSecret = document.getElementById("input-client-secret").value;
    const redirectUri = document.getElementById("input-redirect-uri")?.value || "";
    
    if (!clientId || !clientSecret) {
        alert("Please enter both Client ID and Client Secret.");
        return;
    }
    
    try {
        const res = await fetch("/api/auth/credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri || undefined
            })
        });
        const data = await res.json();
        alert(data.message);
        checkAuthStatus();
    } catch (e) {
        alert("Error saving credentials: " + e.message);
    }
}

async function startYahooLogin() {
    try {
        const res = await fetch("/api/auth/login");
        const data = await res.json();
        if (data.auth_url) {
            window.location.href = data.auth_url;
        } else {
            alert(data.detail || "Could not generate Yahoo OAuth URL.");
        }
    } catch (e) {
        alert("Yahoo OAuth login error: " + e.message);
    }
}

async function loadLeagues() {
    const select = document.getElementById("league-select");
    if (!select) return;
    
    try {
        const res = await fetch("/api/league/list");
        const data = await res.json();
        select.innerHTML = '<option value="">Select a Fantasy League...</option>';
        const leagues = data.leagues || [];
        
        leagues.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l.league_key;
            opt.innerText = `${l.name} (${l.season})`;
            select.appendChild(opt);
        });
        
        if (leagues.length === 0) {
            const opt = document.createElement("option");
            opt.disabled = true;
            if (data.error) {
                opt.innerText = `⚠️ Yahoo API: ${data.error}`;
            } else {
                opt.innerText = "No active Yahoo Fantasy Football leagues found for this account.";
            }
            select.appendChild(opt);
        }

        if (currentLeagueKey && leagues.some(l => l.league_key === currentLeagueKey)) {
            select.value = currentLeagueKey;
        }
        
        select.addEventListener("change", (e) => {
            currentLeagueKey = e.target.value;
            localStorage.setItem("selectedLeagueKey", currentLeagueKey);
        });
    } catch (e) {
        console.error("Error loading leagues:", e);
    }
}

async function syncLeague() {
    if (!currentLeagueKey) {
        alert("Please select a league first.");
        return;
    }
    const btn = document.getElementById("btn-sync-league");
    btn.innerText = "Syncing with Kùzu Graph...";
    btn.disabled = true;
    
    try {
        const res = await fetch(`/api/league/sync/${currentLeagueKey}`, { method: "POST" });
        const data = await res.json();
        alert(data.message);
    } catch (e) {
        alert("Error syncing league: " + e.message);
    } finally {
        btn.innerText = "Sync Yahoo League to Graph DB";
        btn.disabled = false;
    }
}

function initSleeperSync() {
    const btn = document.getElementById("btn-fetch-sleeper-leagues");
    const input = document.getElementById("sleeper-username-input");
    const container = document.getElementById("sleeper-leagues-container");
    if (!btn || !input || !container) return;

    btn.addEventListener("click", async () => {
        const username = input.value.trim();
        if (!username) {
            alert("Please enter a Sleeper username.");
            return;
        }

        btn.innerText = "Searching...";
        btn.disabled = true;
        container.style.display = "block";
        container.innerHTML = '<div style="color:var(--text-muted); padding:0.5rem">Fetching Sleeper leagues...</div>';

        try {
            const res = await fetch(`/api/sleeper/user-leagues?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            const leagues = data.leagues || [];

            if (leagues.length === 0) {
                container.innerHTML = `<div style="color:var(--text-muted); padding:0.5rem">No active Sleeper NFL leagues found for @${username}.</div>`;
                return;
            }

            container.innerHTML = `
                <div style="background:#f8fafc; border:1px solid var(--glass-border); border-radius:8px; padding:1rem">
                    <div style="font-weight:700; color:var(--text-main); margin-bottom:0.75rem">Found ${leagues.length} Leagues for @${data.display_name}:</div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem">
                        ${leagues.map(l => `
                            <div style="background:#ffffff; border:1px solid var(--glass-border); border-radius:6px; padding:0.75rem; display:flex; justify-content:space-between; align-items:center">
                                <div>
                                    <div style="font-weight:700; color:var(--text-main)">${l.name}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted)">${l.total_rosters} Teams · Season ${l.season}</div>
                                </div>
                                <button class="btn btn-accent" style="padding:0.4rem 0.8rem; font-size:0.8rem" onclick="syncSleeperLeague('${l.league_id}', '${l.name}')">Import to Graph DB</button>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div style="color:var(--rose)">Error: ${e.message}</div>`;
        } finally {
            btn.innerText = "Find Sleeper Leagues";
            btn.disabled = false;
        }
    });
}

window.syncSleeperLeague = async function(leagueId, leagueName) {
    try {
        const res = await fetch(`/api/sleeper/sync/${leagueId}`, { method: "POST" });
        const data = await res.json();
        alert(data.message || `Successfully synced ${leagueName}!`);
        localStorage.setItem("selectedLeagueKey", data.league_key);
        currentLeagueKey = data.league_key;
        loadLeagues();
    } catch (e) {
        alert("Error syncing Sleeper league: " + e.message);
    }
};
