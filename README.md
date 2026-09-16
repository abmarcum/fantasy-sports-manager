# 🏈 Fantasy Sports Manager

An advanced, graph-powered analytics command center for fantasy sports built with **FastAPI**, **Kùzu Graph DB** (embedded C++ graph engine), **Neo4j** (optional enterprise Cypher driver), and a clean, responsive white theme dashboard with **Cytoscape.js**.

> [!IMPORTANT]
> **Zero Mock Data Policy**: Connects directly to live Yahoo Fantasy Sports REST APIs via OAuth 2.0 and Sleeper APIs. Real league structures, rosters, draft picks, and statistics are modeled into an interconnected property graph.

---

## ✨ Features Suite

### 1. 🧠 AI Lineup Optimizer & Start/Sit Decider
- **Mathematical Starter Solver**: Calculates your optimal active starting roster using positional baseline projections, defensive matchup difficulty tiers (Grades A through D), and QB-WR/TE stack synergy.
- **Head-to-Head Start/Sit Tool**: Compare two players side-by-side across floor/ceiling projections, target share trends, and red-zone touch volume with an instant AI verdict.
- **Monte Carlo Ceiling vs. Floor**: Probability distributions displaying each player's safety floor vs. boom potential (% chance of explosive 20+ pt output).

### 2. 📡 Waiver Wire Radar & Smart FAAB Advisor
- **Breakout & Opportunity Radar**: Tracks unrostered free agents experiencing snap share surges, target share spikes, or red-zone opportunities.
- **Dynamic FAAB Pricing**: Recommends suggested bid ranges ($) and priority classifications (*High Priority*, *Moderate*, *Deep Stash*) tailored to your team's specific positional deficits.
- **Positional Filters**: One-click filtering across ALL, QB, RB, WR, and TE.

### 3. 🎲 10,000-Run Monte Carlo Playoff Machine & Title Predictor
- **Full Season Monte Carlo Simulations**: Runs 10,000 full permutations of remaining schedule weeks using team scoring distributions and variance.
- **Probabilities & Metrics**:
  - Exact **Playoff Berth %** and **1st-Round Bye %**
  - **Championship Trophy Win %**
  - **Magic Number**: Wins/losses needed to mathematically clinch
  - **Remaining SOS**: Strength of schedule remaining (*Easy*, *Moderate*, *Tough*)

### 4. 🩹 Injury Handcuff Insurance & Vulnerability Matrix
- **Depth Chart Graph Traversal**: Automatically maps every primary starting RB and WR to their direct backup handcuff.
- **Roster Protection Score**: Calculates an overall insurance percentage (0–100%) and categorizes every backfield:
  - `🛡️ INSURED`: Backup secured on your bench.
  - `🚨 EXPOSED (ON WAIVERS)`: Urgent waiver claim recommendation.
  - `⚠️ HELD HOSTAGE`: Rostered by a rival manager, highlighting a targeted trade opportunity.

### 5. 📊 Composite Power Rankings & "The Oracle" Weekly Recap
- **True All-Play Records**: Computes what every team's record would be if they played against all league opponents every week.
- **Coaching Efficiency Index**: Measures how effectively each manager maximized starting roster points vs. points left on the bench.
- **Luck Factor Index**: Quantifies schedule luck by measuring expected vs. actual wins given points against.
- **AI Oracle Narrative Recaps & Awards**: Generates weekly narrative storylines and superlatives (*The Juggernaut*, *Horseshoe Award for Luckiest Manager*, *Heartbreak Kid*, *Coaching Masterclass*).

### 6. ⚔️ All-Time Manager Rivalry Matrix & Trophy Room
- **Pairwise Head-to-Head Records**: Explores NxN manager matchup grids with historical records, win percentages, and rivalry tiers (*Dominating*, *Deadlock*, *Trailing*).
- **Trophy Room Superlatives**: Displays the **Biggest Blowout in League History** and the **Closest Nailbiter Finish** (< 1 pt differential).

### 7. 📉 Positional Power & Roster Depth Benchmark
- **Position-by-Position Power Index**: Benchmarks QB, RB, WR, TE, K, and DEF strength against the league median and assigns letter grades (A+ to D).
- **Trade Diagnosis**: Automatically pinpoints your greatest **Surplus** (trade leverage) and primary **Deficit** (acquisition priority).

### 8. 🌐 Multi-Platform Ingestion: Sleeper API Sync
- **Zero-Password / Zero-Auth Sync**: Search any Sleeper username directly in the **Setup** tab to sync Sleeper leagues, teams, and rosters into the Kùzu Graph Database alongside Yahoo.

### 9. 🎯 Live Draft Assistant & VORP Command Center
- Real-time Value Over Replacement Player (VORP) rankings, QB-WR stack synergy bonuses (`(:Player)-[:STACKED_WITH]->(:Player)`), and bye-week overlap warnings.

### 10. 🔄 Graph Trade Synergy & 3-Team Blockbuster Cycles
- Traverses Kùzu/Neo4j graph paths to formulate win-win 2-team trades and detect **circular 3-way trade cycles** ($A \to C, C \to B, B \to A$) that break 2-team deadlocks by resolving 3 managers' positional deficiencies simultaneously.

### 11. ⚡ Live Game Day, Vegas Implied Totals & Weather Matrix
- **Live Win Probability & Real-Time Swing Meter**: Calculates live probability swings on every score, turnover, and big play with a minute-by-minute clock indicator.
- **Vegas Odds & Implied Team Totals (ITT)**: Calculates Implied Team Totals, spreads, and predicts game scripts (shootout alerts vs clock-killing run games).
- **Stadium Weather Matrix**: Live tracking of wind speed (≥18 mph downgrades kickers/deep WRs), precipitation, and climate-controlled dome advantages.

### 12. 📰 AI Commissioner Newsletter & Discord/Slack Webhook Bot
- **Customizable AI Newsletter**: Generates hilarious weekly dispatches with custom tones (*Savage Roast*, *ESPN Analyst*, *Hype Man*).
- **Superlative Roasts & Honors**: *The Juggernaut*, *The Dumpster Fire*, *The Bench Warmer Disaster*, and *Nailbiter of the Week*.
- **Automated Webhook Dispatcher**: One-click broadcast with rich embeds directly to Discord and Slack league channels.

### 13. 🌐 Multi-League & Multi-Platform Portfolio Manager
- **Cross-League Player Exposure**: Aggregates ownership across Yahoo and Sleeper leagues to compute portfolio exposure percentages and identify core pillars.
- **Rooting Interest Conflict Radar**: Flags direct conflicts where you are starting a player in one league while facing an opponent starting that same player in another.

### 14. 🔮 1,000-Run "What-If" Alternate Universe Schedule Simulator
- Re-simulates the entire season across 1,000 randomized round-robin schedules to isolate pure schedule luck from roster scoring talent.
- Generates "True Talent" standings, 5th-to-95th percentile win ranges, and crowns the *Most Blessed* and *Most Cursed* managers in league history.

### 15. 🛡️ DST & Kicker Matchup Streaming Exploiter
- Discovers top waiver-wire defenses and kickers by cross-referencing opposing offenses against turnover rates, sack allowances, sub-20 Vegas implied totals, and dome weather.

### 16. 🕸️ Cytoscape.js Interactive Graph Canvas
- Interactive 2D visual network map displaying teams, rostered players, draft picks, and head-to-head rivalries.

---

## 🛠️ Architecture & Data Model

```
                    +--------------------------------+
                    |  Yahoo Fantasy Sports API v2   |
                    +---------------+----------------+
                                    | OAuth 2.0
                                    v
     +-----------------------------------------------+
     |                FastAPI Backend                |
     +----------------------+------------------------+
                            |
         +------------------+------------------+
         |                                     |
         v                                     v
+-----------------------+            +----------------------+
|  Kùzu Graph DB (Local)|            |  Neo4j Bolt Engine   |
|  (Default Embedded)   |            |  (Optional Toggle)   |
+-----------------------+            +----------------------+
```

### Graph Schema
- **Nodes**: `:League`, `:Team`, `:Player`, `:NFLTeam`, `:StatCategory`
- **Relationships**:
  - `(:Team)-[:BELONGS_TO]->(:League)`
  - `(:Player)-[:PLAYS_FOR]->(:NFLTeam)`
  - `(:Team)-[:DRAFTED {pick_num, round, cost}]->(:Player)`
  - `(:Team)-[:ROSTERED {week, is_starter, selected_position}]->(:Player)`
  - `(:Player)-[:PERFORMED {week, val}]->(:StatCategory)`
  - `(:Team)-[:MATCHED_AGAINST {week, team_score, opp_score, outcome}]->(:Team)`

---

## 🔑 Setup & Quickstart

### 1. Environment Setup
Copy [.env.example](file:///Users/andrew/ai-workspace/code/ff/.env.example) to `.env` and fill in your Yahoo App credentials:
```bash
cp .env.example .env
```

### 2. Local Python Environment
```bash
# 1. Create virtual environment & activate
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start application server
python main.py
```
Open `http://localhost:5050` in your web browser.

### 3. Docker Compose
```bash
docker-compose up --build
```
Access the application at `http://localhost:5000`.

### 4. LXC Container Deployment (Proxmox VE / LXD)
Inside a Debian 12 or Ubuntu 24.04 LXC container, run the automated native installer:
```bash
# Clone the repository and execute the installer
git clone https://github.com/your-username/fantasy-sports-manager.git /opt/fantasy-sports-manager
cd /opt/fantasy-sports-manager
chmod +x scripts/deploy-lxc.sh
./scripts/deploy-lxc.sh
```
The script installs dependencies, sets up the Python virtual environment, auto-configures your LXC IP for Yahoo OAuth, and registers `fantasy-manager.service` as an auto-restarting systemd daemon.

---

## 💻 Usage Instructions

1. Navigate to the **⚙️ Setup** tab in the top right.
2. If credentials are saved in `.env`, the UI automatically displays the secured `.env` status badge. Click **🔑 Login with Yahoo** or **Authenticate with Yahoo OAuth 2.0** for passwordless single sign-on.
3. Choose your active Yahoo league and click **Sync Yahoo League to Graph DB**, or enter a Sleeper username to import Sleeper leagues.
4. Access the dedicated navigation tabs:
   - **⚡ Game Day**: Live in-game win probabilities, play swing meter, Vegas implied totals & weather conditions.
   - **🧠 Lineup**: Optimize starting lineups & run start/sit comparisons.
   - **📡 Waiver**: Review waiver targets with suggested FAAB bids.
   - **🛡️ Streaming**: Defense (DST) and Kicker matchup exploitation radar.
   - **🎲 Playoff Odds**: View 10,000-run Monte Carlo playoff probabilities.
   - **🔮 What-If**: 1,000-run schedule re-randomizer to calculate expected wins vs schedule luck.
   - **🩹 Handcuffs**: Check roster insurance and depth chart handcuff coverage.
   - **📊 Power Rankings**: View composite All-Play rankings and coaching efficiency.
   - **📰 Commish & Discord**: AI Commissioner weekly recaps with custom tones & Discord/Slack broadcast.
   - **🌐 Portfolio**: Cross-league player exposure & conflicting matchup rooting interest radar.
   - **⚔️ Rivalry Room**: Explore all-time manager records and trophy superlatives.
   - **📉 Roster Depth**: Benchmark positional power vs. the league median.
   - **🔄 Trades**: Formulate 2-team trades and 3-team circular blockbuster cycles.
   - **🎯 Draft**, **⚔️ Matchups**, and **🕸️ Graph Map**.

