import re
import os
import json
import html as html_lib
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Optional
from src.graph_db.driver import db_driver

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

def normalize_cookie_string(raw: Optional[str]) -> str:
    """Converts raw browser cookie strings or tab-separated DevTools cookie tables into HTTP Cookie header format."""
    if not raw:
        return ""
    raw = raw.strip()
    if "\t" in raw:
        cookies = []
        for line in raw.split("\n"):
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) >= 2:
                name = parts[0].strip()
                val = parts[1].strip()
                if name and val and not name.startswith("✓"):
                    cookies.append(f"{name}={val}")
        if cookies:
            return "; ".join(cookies)
    return raw.replace("\n", " ").strip()

class YahooWebScraper:
    """Scrapes Yahoo Fantasy Football leagues, teams, rosters, and draft results using browser session cookies or HTML."""

    def __init__(self, cookie: Optional[str] = None):
        self.cookie = normalize_cookie_string(cookie)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://football.fantasysports.yahoo.com/",
            "Cache-Control": "max-age=0"
        })
        if self.cookie:
            self.session.headers["Cookie"] = self.cookie

    def _get_page(self, url: str) -> str:
        """Fetches an HTML page using the authenticated session and unescapes entities."""
        resp = self.session.get(url, timeout=15, allow_redirects=True)
        if "login.yahoo.com" in resp.url and "login" in resp.text.lower():
            raise PermissionError(
                "Yahoo redirected to login page. Your session cookie may be expired, missing, "
                "or invalid for this private league. Please refresh your Yahoo cookie from your browser."
            )
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to fetch {url} [HTTP {resp.status_code}]")
        return html_lib.unescape(resp.text)

    def parse_league_standings_html(self, html: str, league_id: str) -> Dict[str, Any]:
        """Extracts league title, standings, team names, manager names, and team URLs from HTML."""
        html = html_lib.unescape(html)
        soup = BeautifulSoup(html, "html.parser")

        # 1. League Name
        title_tag = soup.find("title")
        raw_title = title_tag.text.strip() if title_tag else f"Yahoo League {league_id}"
        league_name = raw_title
        for suffix in [
            "| Fantasy Football | Yahoo! Sports",
            "- Free Fantasy Football",
            "- Yahoo! Sports",
            "- Yahoo Sports",
            "- Fantasy Football"
        ]:
            if suffix in league_name:
                league_name = league_name.split(suffix)[0].strip()

        league_header = soup.select_one("#league-title, .league-name, h1.ysf-league-name, h1")
        if league_header and len(league_header.text.strip()) > 3 and "Yahoo" not in league_header.text:
            league_name = league_header.text.strip()

        # Check for user team indicators (e.g. /f1/{league_id}/{t_id}/editteaminfo)
        user_team_id = None
        edit_match = re.search(rf'/f1/{league_id}/(\d+)/editteaminfo', html)
        if edit_match:
            user_team_id = edit_match.group(1)

        # 2. Extract Teams
        team_link_pattern = re.compile(rf"/f1/{league_id}/(\d+)")
        teams_map: Dict[str, Dict[str, Any]] = {}

        # Scan for all team IDs matching /f1/{league_id}/{team_id}
        found_ids = set(re.findall(rf'/f1/{league_id}/(\d+)', html))
        found_ids.discard("0")

        for a in soup.find_all("a", href=team_link_pattern):
            href = a.get("href", "")
            match = team_link_pattern.search(href)
            if not match:
                continue
            t_id = match.group(1)
            t_name = a.text.strip()
            if t_name and t_name.lower() in ["view team", "matchup", "recap", "draft recap"]:
                t_name = ""

            if not t_name:
                img = a.find("img")
                if img and img.get("alt"):
                    t_name = img["alt"].strip()

            parent_row = a.find_parent(["tr", "li", "div"])
            manager_name = "Manager"
            logo_url = ""

            if parent_row:
                mgr_el = parent_row.select_one(".F-sub, .user-id, .manager-name, a[href*='profiles.sports.yahoo.com']")
                if mgr_el and mgr_el.text.strip():
                    manager_name = mgr_el.text.strip()
                img_el = parent_row.find("img")
                if img_el and img_el.get("src") and "yimg.com" in img_el["src"]:
                    logo_url = img_el["src"]

            team_key = f"449.l.{league_id}.t.{t_id}"
            is_user = (t_id == user_team_id) if user_team_id else (t_id == "1")

            if t_id not in teams_map:
                teams_map[t_id] = {
                    "team_key": team_key,
                    "team_id": t_id,
                    "name": t_name or f"Team {t_id}",
                    "manager_name": manager_name,
                    "logo_url": logo_url or f"https://picsum.photos/seed/{t_id}/100/100",
                    "draft_position": int(t_id),
                    "is_user_team": is_user
                }
            elif t_name and (teams_map[t_id]["name"] == f"Team {t_id}" or len(t_name) > len(teams_map[t_id]["name"])):
                teams_map[t_id]["name"] = t_name

        for t_id in found_ids:
            if t_id not in teams_map:
                teams_map[t_id] = {
                    "team_key": f"449.l.{league_id}.t.{t_id}",
                    "team_id": t_id,
                    "name": f"Team {t_id}",
                    "manager_name": f"Manager {t_id}",
                    "logo_url": f"https://picsum.photos/seed/{t_id}/100/100",
                    "draft_position": int(t_id),
                    "is_user_team": (t_id == user_team_id) if user_team_id else False
                }

        teams_list = sorted(list(teams_map.values()), key=lambda x: int(x["team_id"]))

        return {
            "league_key": f"449.l.{league_id}",
            "league_id": str(league_id),
            "name": league_name or f"Yahoo Fantasy League {league_id}",
            "season": "2024",
            "num_teams": len(teams_list) or 10,
            "teams": teams_list
        }

    def parse_team_roster_html(self, html: str, team_key: str) -> List[Dict[str, Any]]:
        """Extracts rostered players, positions, NFL teams, status, and headshots from a team's page."""
        html = html_lib.unescape(html)
        soup = BeautifulSoup(html, "html.parser")
        players = []
        player_link_pattern = re.compile(r"/nfl/players/(\d+)")

        seen_players = set()
        for a in soup.find_all("a", href=player_link_pattern):
            href = a.get("href", "")
            match = player_link_pattern.search(href)
            if not match:
                continue
            p_id = match.group(1)
            p_name = a.text.strip()
            if not p_name or p_id in seen_players:
                continue

            seen_players.add(p_id)
            row = a.find_parent("tr")

            pos = "FLEX"
            nfl_team = "FA"
            status = "Active"
            headshot = f"https://s.yimg.com/it/u/headshots/nfl/players/82x82/{p_id}.png"
            selected_pos = "BN"
            is_starter = False

            if row:
                row_text = row.text

                slot_td = row.find(["td", "th"])
                if slot_td:
                    slot_txt = slot_td.text.strip()
                    if slot_txt:
                        selected_pos = slot_txt
                        is_starter = slot_txt not in ["BN", "IR", "RES"]

                pos_team_match = re.search(r'([A-Z]{2,3})\s*-\s*([A-Z]{1,3})', row_text)
                if pos_team_match:
                    nfl_team = pos_team_match.group(1)
                    pos = pos_team_match.group(2)
                else:
                    for candidate_pos in ["QB", "RB", "WR", "TE", "K", "DEF"]:
                        if re.search(rf'\b{candidate_pos}\b', row_text):
                            pos = candidate_pos
                            break

                status_el = row.select_one(".F-injury, .status, .injury")
                if status_el:
                    status = status_el.text.strip() or "Questionable"

                img_el = row.find("img")
                if img_el and img_el.get("src") and "headshot" in img_el["src"]:
                    headshot = img_el["src"]

            players.append({
                "player_key": f"nfl.p.{p_id}",
                "player_id": p_id,
                "name": p_name,
                "position": pos,
                "nfl_team": nfl_team,
                "status": status,
                "headshot_url": headshot,
                "team_key": team_key,
                "selected_position": selected_pos,
                "is_starter": is_starter
            })

        return players

    def parse_draft_results_html(self, html: str, league_key: str) -> List[Dict[str, Any]]:
        """Extracts draft picks from the draft results page."""
        html = html_lib.unescape(html)
        soup = BeautifulSoup(html, "html.parser")
        picks = []

        rows = soup.find_all("tr")
        current_round = 1
        pick_counter = 1

        for r in rows:
            round_hdr = r.find(["th", "td"], string=re.compile(r"Round\s+(\d+)", re.I))
            if round_hdr:
                m = re.search(r"Round\s+(\d+)", round_hdr.text, re.I)
                if m:
                    current_round = int(m.group(1))

            player_a = r.find("a", href=re.compile(r"/nfl/players/\d+"))
            team_a = r.find("a", href=re.compile(r"/f1/\d+/\d+"))

            if player_a and team_a:
                p_match = re.search(r"/nfl/players/(\d+)", player_a["href"])
                t_match = re.search(r"/f1/(\d+)/(\d+)", team_a["href"])
                if p_match and t_match:
                    t_id = t_match.group(2)
                    p_id = p_match.group(1)
                    picks.append({
                        "team_key": f"449.l.{t_match.group(1)}.t.{t_id}",
                        "player_key": f"nfl.p.{p_id}",
                        "player_name": player_a.text.strip(),
                        "round": current_round,
                        "pick": pick_counter,
                        "cost": 0
                    })
                    pick_counter += 1

        return picks

    def scrape_full_league(self, league_id: str) -> Dict[str, Any]:
        """Automated end-to-end scraper querying league, rosters, and draft pages via session cookies."""
        clean_id = str(league_id).strip()
        if ".l." in clean_id:
            clean_id = clean_id.split(".l.")[-1]
        elif "/f1/" in clean_id:
            clean_id = clean_id.split("/f1/")[-1].split("/")[0]

        # 1. Fetch League Standings / Home
        home_url = f"https://football.fantasysports.yahoo.com/f1/{clean_id}"
        home_html = self._get_page(home_url)
        league_data = self.parse_league_standings_html(home_html, clean_id)

        all_players = []
        # 2. Fetch Each Team's Roster & Precise Team Name
        for team in league_data["teams"]:
            t_id = team["team_id"]
            team_url = f"https://football.fantasysports.yahoo.com/f1/{clean_id}/{t_id}"
            try:
                team_html = self._get_page(team_url)
                
                # Check for precise team title
                t_title = re.search(r"<title>(.*?)</title>", team_html, re.I)
                if t_title:
                    raw_tt = t_title.group(1)
                    if " - " in raw_tt:
                        cand_name = raw_tt.split(" - ")[1].split(" | ")[0].strip()
                        if cand_name and not cand_name.startswith("Team"):
                            team["name"] = cand_name

                team_players = self.parse_team_roster_html(team_html, team["team_key"])
                all_players.extend(team_players)
            except Exception as e:
                print(f"Warning scraping team {t_id}: {e}")

        # 3. Fetch Draft Results (Optional)
        draft_picks = []
        try:
            draft_url = f"https://football.fantasysports.yahoo.com/f1/{clean_id}/draftresults"
            draft_html = self._get_page(draft_url)
            draft_picks = self.parse_draft_results_html(draft_html, league_data["league_key"])
        except Exception as e:
            print(f"Draft results not available or error: {e}")

        league_data["players"] = all_players
        league_data["draft_picks"] = draft_picks

        return league_data

    def ingest_scraped_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Ingests scraped league, team, player, and draft pick records into the Graph DB."""
        league_key = data.get("league_key")
        league_name = data.get("name", "Scraped Fantasy League")
        teams = data.get("teams", [])
        players = data.get("players", [])
        draft_picks = data.get("draft_picks", [])

        # 1. Ingest League Node
        db_driver.execute_write("""
        MERGE (l:League {league_key: $league_key})
        ON CREATE SET l.name = $name, l.season = '2024', l.num_teams = $num_teams, l.scoring_type = 'headhead'
        ON MATCH SET l.name = $name, l.season = '2024', l.num_teams = $num_teams, l.scoring_type = 'headhead'
        """, {
            "league_key": league_key,
            "name": league_name,
            "num_teams": int(len(teams) or 10)
        })

        # 2. Ingest Teams & BELONGS_TO
        for t in teams:
            db_driver.execute_write("""
            MERGE (tm:Team {team_key: $team_key})
            ON CREATE SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
                tm.logo_url = $logo_url, tm.draft_position = $draft_position, tm.is_user_team = $is_user_team
            ON MATCH SET tm.team_id = $team_id, tm.name = $name, tm.manager_name = $manager_name, 
                tm.logo_url = $logo_url, tm.draft_position = $draft_position, tm.is_user_team = $is_user_team
            """, {
                "team_key": t["team_key"],
                "team_id": str(t["team_id"]),
                "name": t["name"],
                "manager_name": t.get("manager_name", "Manager"),
                "logo_url": t.get("logo_url", ""),
                "draft_position": int(t.get("draft_position", 1)),
                "is_user_team": bool(t.get("is_user_team", False))
            })

            db_driver.execute_write("""
            MATCH (tm:Team), (l:League)
            WHERE tm.team_key = $team_key AND l.league_key = $league_key
            CREATE (tm)-[:BELONGS_TO]->(l)
            """, {
                "team_key": t["team_key"],
                "league_key": league_key
            })

        # 3. Ingest Players & ROSTERED
        for p in players:
            db_driver.execute_write("""
            MERGE (pl:Player {player_key: $player_key})
            ON CREATE SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
                pl.nfl_team = $nfl_team, pl.headshot_url = $headshot_url, pl.bye_week = '0',
                pl.adp = 99.0, pl.status = $status
            ON MATCH SET pl.player_id = $player_id, pl.name = $name, pl.position = $position,
                pl.nfl_team = $nfl_team, pl.headshot_url = $headshot_url, pl.status = $status
            """, {
                "player_key": p["player_key"],
                "player_id": str(p["player_id"]),
                "name": p["name"],
                "position": p.get("position", "FLEX"),
                "nfl_team": p.get("nfl_team", "FA"),
                "headshot_url": p.get("headshot_url", ""),
                "status": p.get("status", "Active")
            })

            if p.get("team_key"):
                db_driver.execute_write("""
                MATCH (tm:Team), (pl:Player)
                WHERE tm.team_key = $team_key AND pl.player_key = $player_key
                CREATE (tm)-[:ROSTERED {week: 1, selected_position: $selected_pos, is_starter: $is_starter}]->(pl)
                """, {
                    "team_key": p["team_key"],
                    "player_key": p["player_key"],
                    "selected_pos": p.get("selected_position", "BN"),
                    "is_starter": bool(p.get("is_starter", False))
                })

        # 4. Ingest Draft Picks
        for dp in draft_picks:
            db_driver.execute_write("""
            MATCH (tm:Team), (pl:Player)
            WHERE tm.team_key = $team_key AND pl.player_key = $player_key
            CREATE (tm)-[:DRAFTED {pick_num: $pick_num, round: $round_num, cost: 0}]->(pl)
            """, {
                "team_key": dp["team_key"],
                "player_key": dp["player_key"],
                "pick_num": int(dp.get("pick", 1)),
                "round_num": int(dp.get("round", 1))
            })

        return {
            "status": "success",
            "league_key": league_key,
            "name": league_name,
            "message": f"Successfully scraped & ingested '{league_name}' into Graph DB!",
            "counts": {
                "teams": len(teams),
                "players": len(players),
                "draft_picks": len(draft_picks)
            }
        }
