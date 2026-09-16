// Main App Routing, Auth, League Synchronization
let currentLeagueKey = localStorage.getItem("selectedLeagueKey") || "";
let currentTeamKey = localStorage.getItem("selectedTeamKey") || "";

window.DEFAULT_HEADSHOT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%2394a3b8'><circle cx='32' cy='24' r='14'/><path d='M12 56c0-11 9-20 20-20s20 9 20 20z'/></svg>";

window.getPlayerHeadshot = function(url, playerKeyOrId) {
    if (url && !url.includes("players/82x82") && !url.includes("50x50/3000") && !url.includes("/fnt/headshots/")) {
        return url;
    }
    if (playerKeyOrId) {
        const cleanId = String(playerKeyOrId).replace("nfl.p.", "").trim();
        if (/^\d+$/.test(cleanId)) {
            return `https://sports.yahoo.com/assets/og/player/nfl/${cleanId}/`;
        }
    }
    return window.DEFAULT_HEADSHOT;
};

window.switchTab = function(target) {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(t => {
        if (t.dataset.tab === target) {
            t.classList.add("active");
        } else {
            t.classList.remove("active");
        }
    });
    
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    const targetEl = document.getElementById(`tab-${target}`);
    if (targetEl) {
        targetEl.classList.add("active");
    }
    
    // Trigger tab specific logic
    if (target === "home") window.loadHomeView?.();
    if (target === "gameday") window.loadGamedayView?.();
    if (target === "lineup") window.loadLineupView?.();
    if (target === "waiver") window.loadWaiverView?.();
    if (target === "streaming") window.loadStreamingView?.();
    if (target === "playoff") window.loadPlayoffView?.();
    if (target === "whatif") window.loadWhatIfView?.();
    if (target === "handcuff") window.loadHandcuffView?.();
    if (target === "oracle") window.loadOracleView?.();
    if (target === "newsletter") window.loadNewsletterView?.();
    if (target === "portfolio") window.loadPortfolioView?.();
    if (target === "rivalry") window.loadRivalryView?.();
    if (target === "depth") window.loadRosterDepthView?.();
    if (target === "draft") window.loadDraftView?.();
    if (target === "matchups") window.loadMatchupsView?.();
    if (target === "trade") window.loadTradeView?.();
    if (target === "graph") window.initCytoscapeGraph?.();

    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.refreshActiveTab = function() {
    const activeTab = document.querySelector(".nav-tab.active");
    const target = activeTab ? activeTab.dataset.tab : "home";
    if (target === "home") window.loadHomeView?.();
    else if (target === "gameday") window.loadGamedayView?.();
    else if (target === "lineup") window.loadLineupView?.();
    else if (target === "waiver") window.loadWaiverView?.();
    else if (target === "streaming") window.loadStreamingView?.();
    else if (target === "playoff") window.loadPlayoffView?.();
    else if (target === "whatif") window.loadWhatIfView?.();
    else if (target === "handcuff") window.loadHandcuffView?.();
    else if (target === "oracle") window.loadOracleView?.();
    else if (target === "newsletter") window.loadNewsletterView?.();
    else if (target === "portfolio") window.loadPortfolioView?.();
    else if (target === "rivalry") window.loadRivalryView?.();
    else if (target === "depth") window.loadRosterDepthView?.();
    else if (target === "draft") window.loadDraftView?.();
    else if (target === "matchups") window.loadMatchupsView?.();
    else if (target === "trade") window.loadTradeView?.();
    else if (target === "graph") window.initCytoscapeGraph?.();
};

function initApp() {
    initTabs();
    handleAuthQueryParams();
    checkAuthStatus();
    loadLeagues();
    initSleeperSync();

    // Setup Global Context Bar Event Listeners
    const globalLeagueSelect = document.getElementById("global-league-select");
    const globalTeamSelect = document.getElementById("global-team-select");
    const setupLeagueSelect = document.getElementById("league-select");

    const onLeagueChange = async (newLeagueKey) => {
        if (!newLeagueKey) return;
        currentLeagueKey = newLeagueKey;
        localStorage.setItem("selectedLeagueKey", currentLeagueKey);
        if (globalLeagueSelect && globalLeagueSelect.value !== currentLeagueKey) {
            globalLeagueSelect.value = currentLeagueKey;
        }
        if (setupLeagueSelect && setupLeagueSelect.value !== currentLeagueKey) {
            setupLeagueSelect.value = currentLeagueKey;
        }
        await loadTeamsForLeague(currentLeagueKey);
        window.refreshActiveTab?.();
    };

    globalLeagueSelect?.addEventListener("change", (e) => onLeagueChange(e.target.value));
    setupLeagueSelect?.addEventListener("change", (e) => onLeagueChange(e.target.value));

    globalTeamSelect?.addEventListener("change", (e) => {
        const selectedKey = e.target.value;
        if (!selectedKey) return;
        currentTeamKey = selectedKey;
        localStorage.setItem("selectedTeamKey", currentTeamKey);
        const selectedOpt = globalTeamSelect.options[globalTeamSelect.selectedIndex];
        updateTeamPerspectiveUI({
            team_key: selectedKey,
            name: selectedOpt.dataset.name || selectedOpt.innerText,
            manager_name: selectedOpt.dataset.manager || "",
            is_user_team: selectedOpt.dataset.isUser === "true"
        });
        window.refreshActiveTab?.();
    });
    
    // Bind brand logo/title to home tab
    const brandBtn = document.getElementById("brand-home-btn") || document.querySelector(".brand");
    if (brandBtn) {
        brandBtn.addEventListener("click", () => {
            window.switchTab("home");
        });
    }

    // Load initial home view
    window.loadHomeView?.();
    
    // Bind buttons
    document.getElementById("btn-save-credentials")?.addEventListener("click", saveCredentials);
    document.getElementById("btn-sync-league")?.addEventListener("click", syncLeague);
    document.getElementById("btn-refresh-leagues")?.addEventListener("click", () => loadLeagues(true));
    document.getElementById("btn-sync-manual-league")?.addEventListener("click", syncManualLeague);
    document.getElementById("btn-load-sample-league")?.addEventListener("click", loadSampleLeague);
    document.getElementById("btn-run-diagnostic")?.addEventListener("click", runYahooDiagnostic);
    document.getElementById("btn-yahoo-login")?.addEventListener("click", startYahooLogin);
    document.getElementById("btn-header-login")?.addEventListener("click", startYahooLogin);
    document.getElementById("btn-header-logout")?.addEventListener("click", logoutYahoo);
    
    // Scraper mode toggles and action buttons
    document.getElementById("btn-scraper-mode-cookie")?.addEventListener("click", () => {
        const cp = document.getElementById("scraper-cookie-panel");
        const hp = document.getElementById("scraper-html-panel");
        const bc = document.getElementById("btn-scraper-mode-cookie");
        const bh = document.getElementById("btn-scraper-mode-html");
        if (cp && hp) { cp.style.display = "block"; hp.style.display = "none"; }
        if (bc && bh) {
            bc.style.background = "#4f46e5"; bc.style.color = "#ffffff";
            bh.style.background = "#ffffff"; bh.style.color = "var(--text-main)";
        }
    });

    document.getElementById("btn-scraper-mode-html")?.addEventListener("click", () => {
        const cp = document.getElementById("scraper-cookie-panel");
        const hp = document.getElementById("scraper-html-panel");
        const bc = document.getElementById("btn-scraper-mode-cookie");
        const bh = document.getElementById("btn-scraper-mode-html");
        if (cp && hp) { cp.style.display = "none"; hp.style.display = "block"; }
        if (bc && bh) {
            bh.style.background = "#4f46e5"; bh.style.color = "#ffffff";
            bc.style.background = "#ffffff"; bc.style.color = "var(--text-main)";
        }
    });

    document.getElementById("btn-run-scrape")?.addEventListener("click", runCookieScrape);
    document.getElementById("btn-run-html-import")?.addEventListener("click", runHtmlImport);

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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

function handleAuthQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("auth_success")) {
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("🎉 Successfully authenticated with Yahoo OAuth 2.0!");
        checkAuthStatus();
        loadLeagues();
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
            const target = tab.dataset.tab;
            window.switchTab(target);
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

async function loadLeagues(showNotice = false) {
    const setupSelect = document.getElementById("league-select");
    const globalSelect = document.getElementById("global-league-select");
    
    // Immediate pre-population of teams if currentLeagueKey is already stored
    if (currentLeagueKey) {
        loadTeamsForLeague(currentLeagueKey);
    }

    try {
        const res = await fetch(`/api/league/list${showNotice ? '?refresh=true' : ''}`);
        const data = await res.json();
        const leagues = data.leagues || [];

        if (data.debug) {
            console.log("Yahoo League Ingestion Debug Log:", data.debug);
        }

        const populate = (sel, placeholder) => {
            if (!sel) return;
            sel.innerHTML = `<option value="">${placeholder}</option>`;
            leagues.forEach(l => {
                const opt = document.createElement("option");
                opt.value = l.league_key;
                opt.innerText = `${l.name} (${l.season})`;
                if (l.league_key === currentLeagueKey) opt.selected = true;
                sel.appendChild(opt);
            });
            if (leagues.length === 0) {
                const opt = document.createElement("option");
                opt.disabled = true;
                opt.innerText = data.error ? `⚠️ Yahoo API: ${data.error}` : "No leagues auto-detected";
                sel.appendChild(opt);
            }
        };

        populate(setupSelect, "Select a Fantasy League...");
        populate(globalSelect, "Select a League...");

        if (leagues.length === 0 && showNotice) {
            alert("Yahoo did not return leagues automatically for this account. You can enter your League ID in Setup to sync directly!");
        } else if (leagues.length > 0 && showNotice) {
            alert(`Found ${leagues.length} league(s)!`);
        }

        // Determine active league
        if (!currentLeagueKey || !leagues.some(l => l.league_key === currentLeagueKey)) {
            if (leagues.length > 0) {
                currentLeagueKey = leagues[0].league_key;
                localStorage.setItem("selectedLeagueKey", currentLeagueKey);
            }
        }

        if (currentLeagueKey) {
            if (setupSelect) setupSelect.value = currentLeagueKey;
            if (globalSelect) globalSelect.value = currentLeagueKey;
            await loadTeamsForLeague(currentLeagueKey);
        }

    } catch (e) {
        console.error("Error loading leagues:", e);
        if (showNotice) alert("Error fetching leagues: " + e.message);
    }
}

async function loadTeamsForLeague(leagueKey) {
    const teamSelect = document.getElementById("global-team-select");
    const badge = document.getElementById("focused-team-badge");
    const hintDisplay = document.getElementById("perspective-team-display");
    if (!teamSelect) return;

    if (!leagueKey) {
        teamSelect.innerHTML = '<option value="">Select league first...</option>';
        if (badge) badge.style.display = "none";
        if (hintDisplay) hintDisplay.innerText = "No League Selected";
        return;
    }

    try {
        const res = await fetch(`/api/league/${encodeURIComponent(leagueKey)}/teams`);
        const data = await res.json();
        const teams = data.teams || [];

        teamSelect.innerHTML = "";
        if (teams.length === 0) {
            teamSelect.innerHTML = '<option value="">No teams found</option>';
            if (badge) badge.style.display = "none";
            if (hintDisplay) hintDisplay.innerText = "No Teams Found";
            return;
        }

        // Determine target team before building options
        let targetTeam = teams.find(t => t.team_key === currentTeamKey);
        if (!targetTeam) {
            targetTeam = teams.find(t => t.is_user_team) || teams[0];
            currentTeamKey = targetTeam ? targetTeam.team_key : "";
            if (currentTeamKey) {
                localStorage.setItem("selectedTeamKey", currentTeamKey);
            }
        }

        teams.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.team_key;
            const star = t.is_user_team ? " ★ (Your Team)" : "";
            const manager = t.manager_name ? ` · ${t.manager_name}` : "";
            opt.innerText = `${t.name}${manager}${star}`;
            opt.dataset.isUser = t.is_user_team ? "true" : "false";
            opt.dataset.name = t.name;
            opt.dataset.manager = t.manager_name || "";
            if (targetTeam && t.team_key === targetTeam.team_key) {
                opt.selected = true;
            }
            teamSelect.appendChild(opt);
        });

        if (targetTeam) {
            teamSelect.value = targetTeam.team_key;
            updateTeamPerspectiveUI(targetTeam);
        }
    } catch (e) {
        console.error("Error loading teams for league:", e);
        teamSelect.innerHTML = '<option value="">Error loading teams</option>';
    }
}

function updateTeamPerspectiveUI(team) {
    const badge = document.getElementById("focused-team-badge");
    const hintDisplay = document.getElementById("perspective-team-display");
    if (!team) return;

    if (badge) {
        if (team.is_user_team) {
            badge.innerText = "★ Your Team";
            badge.style.display = "inline-flex";
            badge.style.background = "rgba(16, 185, 129, 0.12)";
            badge.style.color = "#059669";
            badge.style.borderColor = "rgba(16, 185, 129, 0.25)";
        } else {
            badge.innerText = "Active Focus";
            badge.style.display = "inline-flex";
            badge.style.background = "rgba(79, 70, 229, 0.08)";
            badge.style.color = "var(--primary)";
            badge.style.borderColor = "rgba(79, 70, 229, 0.2)";
        }
    }

    if (hintDisplay) {
        const mgr = team.manager_name ? ` (${team.manager_name})` : "";
        hintDisplay.innerText = `${team.name}${mgr}`;
    }
}

window.loadTeamsForLeague = loadTeamsForLeague;

async function syncManualLeague() {
    const input = document.getElementById("manual-league-key-input");
    const rawVal = input ? input.value.trim() : "";
    if (!rawVal) {
        alert("Please enter your Yahoo League ID or League Key (e.g. 123456 or 449.l.123456)");
        return;
    }

    const btn = document.getElementById("btn-sync-manual-league");
    if (btn) {
        btn.innerText = "Syncing...";
        btn.disabled = true;
    }

    try {
        const res = await fetch(`/api/league/sync/${encodeURIComponent(rawVal)}`, { method: "POST" });
        const data = await res.json();
        if (data.status === "success") {
            alert(`🎉 ${data.message}`);
            const syncedKey = data.league_key || (rawVal.includes(".l.") ? rawVal : `449.l.${rawVal}`);
            currentLeagueKey = syncedKey;
            localStorage.setItem("selectedLeagueKey", currentLeagueKey);
            await loadLeagues();
        } else {
            alert(`❌ Sync error: ${data.detail || data.message || "Failed to sync"}`);
        }
    } catch (e) {
        alert("Error syncing manual league: " + e.message);
    } finally {
        if (btn) {
            btn.innerText = "Sync Manual League ID";
            btn.disabled = false;
        }
    }
}

async function loadSampleLeague() {
    const btn = document.getElementById("btn-load-sample-league");
    if (btn) {
        btn.innerText = "Loading Demo...";
        btn.disabled = true;
    }
    try {
        const res = await fetch("/api/league/sample", { method: "POST" });
        const data = await res.json();
        if (data.status === "success") {
            alert(`🎉 ${data.message}`);
            currentLeagueKey = data.league_key;
            localStorage.setItem("selectedLeagueKey", currentLeagueKey);
            await loadLeagues();
            window.loadHomeView?.();
        } else {
            alert(`❌ Error: ${data.detail || "Failed to load sample league"}`);
        }
    } catch (e) {
        alert("Error loading sample league: " + e.message);
    } finally {
        if (btn) {
            btn.innerText = "⚡ Load Sample NFL League (Instant Demo)";
            btn.disabled = false;
        }
    }
}

async function runYahooDiagnostic() {
    const btn = document.getElementById("btn-run-diagnostic");
    const container = document.getElementById("diagnostic-results");
    const input = document.getElementById("manual-league-key-input");
    const leagueId = input ? input.value.trim() : "1667331";

    if (btn) {
        btn.innerText = "Running Probe...";
        btn.disabled = true;
    }
    if (container) {
        container.style.display = "block";
        container.innerText = "⏳ Probing Yahoo OAuth token status and API endpoints in real-time...\n";
    }

    try {
        const res = await fetch(`/api/auth/diagnostic?league_id=${encodeURIComponent(leagueId || "1667331")}`);
        const data = await res.json();
        
        let out = `================ YAHOO API DIAGNOSTIC REPORT ================\n`;
        out += `Probe Timestamp: ${data.timestamp}\n\n`;
        out += `--- TOKEN STATUS ---\n`;
        out += `• Authenticated: ${data.token_info.is_authenticated ? "YES ✅" : "NO ❌"}\n`;
        out += `• Token File Exists: ${data.token_info.token_file_exists ? "YES" : "NO"}\n`;
        out += `• Token Type: ${data.token_info.token_type || "N/A"}\n`;
        out += `• Granted Scope: ${data.token_info.granted_scope || "None specified"}\n`;
        out += `• User GUID: ${data.token_info.xoauth_yahoo_guid || "N/A"}\n`;
        out += `• Token Expired: ${data.token_info.is_expired ? "EXPIRED ⚠️" : "ACTIVE (" + data.token_info.expires_in_seconds + "s remaining) ✅"}\n`;
        out += `• Refresh Token Available: ${data.token_info.has_refresh_token ? "YES ✅" : "NO"}\n\n`;

        out += `--- ENDPOINT PROBE RESULTS ---\n`;
        for (const probe of (data.endpoint_probes || [])) {
            const statusIcon = probe.success ? "✅ 200 OK" : `❌ HTTP ${probe.status_code}`;
            out += `[${statusIcon}] ${probe.endpoint}\n`;
            if (probe.error_detail) {
                out += `   Error: ${probe.error_detail}\n`;
            }
            if (probe.body_preview && !probe.success) {
                out += `   Raw Body: ${probe.body_preview.trim()}\n`;
            }
            out += `\n`;
        }

        if (container) {
            container.innerText = out;
        }
    } catch (e) {
        if (container) {
            container.innerText = "Failed to run diagnostic probe: " + e.message;
        }
    } finally {
        if (btn) {
            btn.innerText = "🔍 Run Live Yahoo API Diagnostic Probe";
            btn.disabled = false;
        }
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

async function runCookieScrape() {
    const leagueInput = document.getElementById("scrape-league-id-input");
    const cookieInput = document.getElementById("scrape-cookie-input");
    const leagueId = leagueInput ? leagueInput.value.trim() : "";
    const cookie = cookieInput ? cookieInput.value.trim() : "";

    if (!leagueId) {
        alert("Please enter a Yahoo League ID (e.g. 1667331).");
        return;
    }

    const btn = document.getElementById("btn-run-scrape");
    if (btn) {
        btn.innerText = "🕷️ Scraping Teams & Rosters (5-10s)...";
        btn.disabled = true;
    }

    try {
        const res = await fetch("/api/league/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ league_id: leagueId, cookie: cookie || null })
        });
        const data = await res.json();
        if (data.status === "success") {
            alert(`🎉 ${data.message}\nTeams: ${data.counts?.teams || 0} | Players: ${data.counts?.players || 0}`);
            currentLeagueKey = data.league_key;
            localStorage.setItem("selectedLeagueKey", currentLeagueKey);
            await loadLeagues();
            window.loadHomeView?.();
        } else {
            alert(`❌ Scrape error: ${data.detail || data.message || "Failed to scrape league"}`);
        }
    } catch (e) {
        alert("Error executing scraper: " + e.message);
    } finally {
        if (btn) {
            btn.innerText = "🕷️ Scrape Full League & Ingest into Graph DB";
            btn.disabled = false;
        }
    }
}

async function runHtmlImport() {
    const leagueInput = document.getElementById("scrape-html-league-id");
    const htmlInput = document.getElementById("scrape-html-textarea");
    const leagueId = leagueInput ? leagueInput.value.trim() : "";
    const html = htmlInput ? htmlInput.value.trim() : "";

    if (!leagueId) {
        alert("Please enter a Yahoo League ID (e.g. 1667331).");
        return;
    }
    if (!html || html.length < 50) {
        alert("Please paste the page HTML source from your browser (Right-click → View Page Source → Copy All).");
        return;
    }

    const btn = document.getElementById("btn-run-html-import");
    if (btn) {
        btn.innerText = "📄 Parsing HTML...";
        btn.disabled = true;
    }

    try {
        const res = await fetch("/api/league/scrape-html", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ league_id: leagueId, html: html })
        });
        const data = await res.json();
        if (data.status === "success") {
            alert(`🎉 ${data.message}\nImported ${data.counts?.teams || 0} teams into Graph DB!`);
            currentLeagueKey = data.league_key;
            localStorage.setItem("selectedLeagueKey", currentLeagueKey);
            await loadLeagues();
            window.loadHomeView?.();
        } else {
            alert(`❌ Import error: ${data.detail || data.message || "Failed to import HTML"}`);
        }
    } catch (e) {
        alert("Error importing HTML: " + e.message);
    } finally {
        if (btn) {
            btn.innerText = "📄 Parse & Import League from HTML";
            btn.disabled = false;
        }
    }
}

