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

### 10. 🔄 Graph Trade Synergy Finder
- Traverses Kùzu/Neo4j graph paths to discover win-win trade partners with complementary surplus and deficit positional depth.

### 11. 🕸️ Cytoscape.js Interactive Graph Canvas
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

---

## 💻 Usage Instructions

1. Navigate to the **⚙️ Setup** tab in the top right.
2. If credentials are saved in `.env`, the UI automatically displays the secured `.env` status badge. Click **🔑 Login with Yahoo** or **Authenticate with Yahoo OAuth 2.0** for passwordless single sign-on.
3. Choose your active Yahoo league and click **Sync Yahoo League to Graph DB**, or enter a Sleeper username to import Sleeper leagues.
4. Access the dedicated navigation tabs:
   - **🧠 Lineup**: Optimize starting lineups & run start/sit comparisons.
   - **📡 Waiver**: Review waiver targets with suggested FAAB bids.
   - **🎲 Playoff Odds**: View 10,000-run Monte Carlo playoff probabilities.
   - **🩹 Handcuffs**: Check roster insurance and depth chart handcuff coverage.
   - **📊 Power Rankings**: View composite All-Play rankings and coaching efficiency.
   - **⚔️ Rivalry Room**: Explore all-time manager records and trophy superlatives.
   - **📉 Roster Depth**: Benchmark positional power vs. the league median.
   - **🎯 Draft**, **⚔️ Matchups**, **🔄 Trades**, and **🕸️ Graph Map**.

