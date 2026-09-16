import requests
from typing import Dict, List, Any, Optional
from src.yahoo_auth import yahoo_oauth

BASE_URL = "https://fantasysports.yahooapis.com/fantasy/v2"

class YahooFantasyClient:
    """Client for Yahoo Fantasy Sports REST API v2."""

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        headers = yahoo_oauth.get_auth_headers()
        url = f"{BASE_URL}/{endpoint}"
        if params is None:
            params = {}
        params["format"] = "json"

        response = requests.get(url, headers=headers, params=params, timeout=15)
        if response.status_code != 200:
            err_detail = response.text
            try:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(response.text)
                desc = root.find(".//description")
                detail = root.find(".//detail")
                if desc is not None and desc.text:
                    err_detail = desc.text.strip()
                    if detail is not None and detail.text:
                        err_detail += f" ({detail.text.strip()})"
            except Exception:
                try:
                    j = response.json()
                    if "error" in j:
                        err_detail = str(j["error"])
                except Exception:
                    pass
            raise RuntimeError(f"Yahoo API [{response.status_code}] on '{endpoint}': {err_detail}")
        return response.json()

    def test_endpoint(self, endpoint: str) -> Dict[str, Any]:
        """Diagnostic probe for testing an endpoint directly and returning HTTP status code and response body."""
        try:
            headers = yahoo_oauth.get_auth_headers()
        except Exception as e:
            return {"endpoint": endpoint, "status_code": 0, "error": f"Auth Header Error: {str(e)}"}
            
        url = f"{BASE_URL}/{endpoint}"
        params = {"format": "json"}
        try:
            response = requests.get(url, headers=headers, params=params, timeout=12)
            body_sample = response.text[:600]
            parsed_err = ""
            if response.status_code != 200:
                try:
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(response.text)
                    desc = root.find(".//description")
                    detail = root.find(".//detail")
                    if desc is not None and desc.text:
                        parsed_err = desc.text.strip()
                        if detail is not None and detail.text:
                            parsed_err += f" ({detail.text.strip()})"
                except Exception:
                    parsed_err = body_sample
            return {
                "endpoint": endpoint,
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "error_detail": parsed_err if parsed_err else None,
                "body_preview": body_sample
            }
        except Exception as ex:
            return {"endpoint": endpoint, "status_code": -1, "error": str(ex)}

    def get_user_leagues(self, game_key: str = "nfl") -> List[Dict[str, Any]]:
        """Fetch all fantasy football leagues for authenticated user with robust multi-endpoint & merged JSON parsing."""
        endpoints = [
            "users;use_login=1/games;game_keys=449/leagues",
            f"users;use_login=1/games;game_keys={game_key}/leagues",
            "users;use_login=1/games/leagues",
            "users;use_login=1/games;game_keys=449/teams",
            f"users;use_login=1/games;game_keys={game_key}/teams",
            "users;use_login=1/games/teams",
            "users;use_login=1/leagues"
        ]
        
        leagues_dict = {}
        debug_logs = []
        
        for ep in endpoints:
            try:
                res = self._get(ep)
                debug_logs.append(f"Endpoint '{ep}' succeeded.")
                
                # Recursive JSON extractor handling both single dicts and Yahoo's serialized lists of dicts
                def _process_item(item_data):
                    if not isinstance(item_data, dict):
                        return
                    lk = item_data.get("league_key")
                    if not lk and "team_key" in item_data:
                        tk = str(item_data["team_key"])
                        if ".l." in tk:
                            lk = tk.rsplit(".t.", 1)[0]
                    
                    if lk and isinstance(lk, str) and ".l." in lk:
                        name_val = item_data.get("name")
                        league_name = str(name_val) if name_val else f"Fantasy League ({lk})"
                        if lk not in leagues_dict:
                            leagues_dict[lk] = {
                                "league_key": lk,
                                "league_id": str(item_data.get("league_id", lk.split(".")[-1] if "." in lk else lk)),
                                "name": league_name,
                                "num_teams": int(item_data.get("num_teams", 10) or 10),
                                "season": str(item_data.get("season", "2024")),
                                "draft_status": str(item_data.get("draft_status", "postdraft")),
                                "scoring_type": str(item_data.get("scoring_type", "headhead")),
                                "current_week": int(item_data.get("current_week", 1) or 1)
                            }
                        elif name_val and leagues_dict[lk]["name"].startswith("Fantasy League ("):
                            leagues_dict[lk]["name"] = str(name_val)

                def _walk(obj):
                    if isinstance(obj, dict):
                        _process_item(obj)
                        for v in obj.values():
                            _walk(v)
                    elif isinstance(obj, list):
                        # Merge list of single-entry dicts if this list represents an XML element
                        merged = {}
                        for el in obj:
                            if isinstance(el, dict):
                                merged.update(el)
                            elif isinstance(el, list):
                                for sub in el:
                                    if isinstance(sub, dict):
                                        merged.update(sub)
                        if merged:
                            _process_item(merged)
                        for el in obj:
                            _walk(el)

                _walk(res.get("fantasy_content", {}))
                if leagues_dict:
                    break
            except Exception as e:
                debug_logs.append(f"Endpoint '{ep}' error: {str(e)}")
                print(f"Endpoint '{ep}' fetch warning: {e}")

        # If any leagues have placeholder names, fetch real name via settings
        for lk, l_info in leagues_dict.items():
            if l_info["name"].startswith("Fantasy League ("):
                try:
                    s_info = self.get_league_settings(lk)
                    if s_info.get("name"):
                        l_info["name"] = s_info["name"]
                    if s_info.get("season"):
                        l_info["season"] = s_info["season"]
                except Exception:
                    pass

        self.last_debug = debug_logs
        return list(leagues_dict.values())

    def get_league_settings(self, league_key: str) -> Dict[str, Any]:
        """Fetch settings, scoring rules, and roster positions for a league."""
        res = self._get(f"league/{league_key}/settings")
        try:
            league = res.get("fantasy_content", {}).get("league", [])
            info = league[0] if isinstance(league, list) and len(league) > 0 else {}
            settings_raw = league[1].get("settings", [])[0] if isinstance(league, list) and len(league) > 1 else {}
            
            roster_positions = []
            for r_pos in settings_raw.get("roster_positions", []):
                pos = r_pos.get("roster_position", {})
                roster_positions.append({
                    "position": pos.get("position"),
                    "count": pos.get("count"),
                    "position_type": pos.get("position_type")
                })

            stat_categories = []
            for stat in settings_raw.get("stat_categories", {}).get("stats", []):
                s = stat.get("stat", {})
                stat_categories.append({
                    "stat_id": s.get("stat_id"),
                    "name": s.get("name"),
                    "display_name": s.get("display_name"),
                    "position_type": s.get("position_type")
                })

            return {
                "league_key": info.get("league_key", league_key),
                "name": info.get("name", "Fantasy League"),
                "num_teams": info.get("num_teams", 10),
                "scoring_type": settings_raw.get("scoring_type", "headhead"),
                "draft_type": settings_raw.get("draft_type", "live"),
                "roster_positions": roster_positions,
                "stat_categories": stat_categories
            }
        except Exception as e:
            print(f"Error parsing league settings: {e}")
            return {"league_key": league_key, "name": "Fantasy League", "num_teams": 10}

    def get_league_teams(self, league_key: str) -> List[Dict[str, Any]]:
        """Fetch all teams, managers, logos, and draft positions in a league."""
        res = self._get(f"league/{league_key}/teams")
        teams_list = []
        try:
            teams_dict = {}
            def _walk_teams(obj):
                if isinstance(obj, dict):
                    if "team_key" in obj and "name" in obj and obj.get("team_key"):
                        tk = obj["team_key"]
                        if tk not in teams_dict:
                            mgr_name = "Manager"
                            managers = obj.get("managers", [])
                            if isinstance(managers, list) and len(managers) > 0:
                                mgr_name = managers[0].get("manager", {}).get("nickname", "Manager")
                            
                            logo_url = ""
                            logos = obj.get("team_logos", [])
                            if isinstance(logos, list) and len(logos) > 0:
                                logo_url = logos[0].get("team_logo", {}).get("url", "")

                            teams_dict[tk] = {
                                "team_key": tk,
                                "team_id": obj.get("team_id", tk.split(".")[-1]),
                                "name": obj.get("name", "Team"),
                                "manager_name": mgr_name,
                                "logo_url": logo_url,
                                "draft_position": obj.get("draft_position", 1),
                                "is_user_team": obj.get("is_owned_by_current_login", 0) == 1
                            }
                    for v in obj.values():
                        _walk_teams(v)
                elif isinstance(obj, list):
                    for item in obj:
                        _walk_teams(item)

            _walk_teams(res.get("fantasy_content", {}))
            teams_list = list(teams_dict.values())
        except Exception as e:
            print(f"Error parsing league teams: {e}")
        return teams_list

    def get_draft_results(self, league_key: str) -> List[Dict[str, Any]]:
        """Fetch all completed draft picks for a league."""
        res = self._get(f"league/{league_key}/draftresults")
        picks = []
        try:
            def _walk_picks(obj):
                if isinstance(obj, dict):
                    if "player_key" in obj and "team_key" in obj and "pick" in obj:
                        picks.append({
                            "pick": obj.get("pick"),
                            "round": obj.get("round"),
                            "team_key": obj.get("team_key"),
                            "player_key": obj.get("player_key"),
                            "cost": obj.get("cost", 0)
                        })
                    for v in obj.values():
                        _walk_picks(v)
                elif isinstance(obj, list):
                    for item in obj:
                        _walk_picks(item)

            _walk_picks(res.get("fantasy_content", {}))
        except Exception as e:
            print(f"Error parsing draft results: {e}")
        return picks

    def get_available_players(self, league_key: str, start: int = 0, count: int = 50) -> List[Dict[str, Any]]:
        """Fetch available/undrafted players with Yahoo profile headshots."""
        res = self._get(f"league/{league_key}/players;status=A;start={start};count={count}")
        players_dict = {}
        try:
            def _walk_players(obj):
                if isinstance(obj, dict):
                    if "player_key" in obj and "name" in obj and obj.get("player_key"):
                        pk = obj["player_key"]
                        if pk not in players_dict:
                            name_val = obj.get("name", {})
                            full_name = name_val.get("full") if isinstance(name_val, dict) else str(name_val)
                            
                            headshot_url = ""
                            if "headshot" in obj and isinstance(obj["headshot"], dict):
                                headshot_url = obj["headshot"].get("url", "")

                            bye_week = "0"
                            if "bye_weeks" in obj and isinstance(obj["bye_weeks"], dict):
                                bye_week = obj["bye_weeks"].get("week", "0")

                            players_dict[pk] = {
                                "player_key": pk,
                                "player_id": obj.get("player_id", pk.split(".")[-1]),
                                "name": full_name or "Player",
                                "position": obj.get("primary_position", "FLEX"),
                                "nfl_team": obj.get("editorial_team_abbr", "FA"),
                                "headshot_url": headshot_url,
                                "bye_week": str(bye_week),
                                "status": obj.get("status", "Active")
                            }
                    for v in obj.values():
                        _walk_players(v)
                elif isinstance(obj, list):
                    for item in obj:
                        _walk_players(item)

            _walk_players(res.get("fantasy_content", {}))
        except Exception as e:
            print(f"Error parsing available players: {e}")
        return list(players_dict.values())

    def get_team_roster(self, team_key: str, week: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch roster players and starters/bench status for a given week."""
        endpoint = f"team/{team_key}/roster"
        if week is not None:
            endpoint += f";week={week}"
        res = self._get(endpoint)
        roster_players = []
        try:
            def _walk_roster(obj):
                if isinstance(obj, dict):
                    if "player_key" in obj and "name" in obj:
                        pk = obj["player_key"]
                        name_val = obj.get("name", {})
                        full_name = name_val.get("full") if isinstance(name_val, dict) else str(name_val)
                        
                        headshot_url = ""
                        if "headshot" in obj and isinstance(obj["headshot"], dict):
                            headshot_url = obj["headshot"].get("url", "")

                        roster_players.append({
                            "player_key": pk,
                            "player_id": obj.get("player_id", pk.split(".")[-1]),
                            "name": full_name,
                            "position": obj.get("primary_position", "FLEX"),
                            "nfl_team": obj.get("editorial_team_abbr", "FA"),
                            "headshot_url": headshot_url,
                            "selected_position": "BN",
                            "is_starter": True
                        })
                    for v in obj.values():
                        _walk_roster(v)
                elif isinstance(obj, list):
                    for item in obj:
                        _walk_roster(item)

            _walk_roster(res.get("fantasy_content", {}))
        except Exception as e:
            print(f"Error parsing team roster: {e}")
        return roster_players

    def get_league_scoreboard(self, league_key: str, week: Optional[int] = None) -> Dict[str, Any]:
        """Fetch head-to-head scoreboard for all matchups in a week."""
        endpoint = f"league/{league_key}/scoreboard"
        if week is not None:
            endpoint += f";week={week}"
        res = self._get(endpoint)
        matchups = []
        try:
            league = res.get("fantasy_content", {}).get("league", [])
            sb = league[1].get("scoreboard", {}) if isinstance(league, list) and len(league) > 1 else {}
            week_num = sb.get("week", week or 1)
            matchups_data = sb.get("0", {}).get("matchups", {}) if isinstance(sb, dict) else {}
            m_count = matchups_data.get("count", 0) if isinstance(matchups_data, dict) else 0
            for i in range(m_count):
                m_raw = matchups_data.get(str(i), {}).get("matchup", {})
                teams_data = m_raw.get("0", {}).get("teams", {})
                
                team1_raw = teams_data.get("0", {}).get("team", []) if isinstance(teams_data, dict) else []
                team2_raw = teams_data.get("1", {}).get("team", []) if isinstance(teams_data, dict) else []
                
                t1_meta = team1_raw[0] if isinstance(team1_raw, list) and len(team1_raw) > 0 else {}
                t1_points = t1_meta.get("team_points", {}).get("total", 0) if isinstance(t1_meta, dict) else 0
                t1_projected = t1_meta.get("team_projected_points", {}).get("total", 0) if isinstance(t1_meta, dict) else 0
                
                t2_meta = team2_raw[0] if isinstance(team2_raw, list) and len(team2_raw) > 0 else {}
                t2_points = t2_meta.get("team_points", {}).get("total", 0) if isinstance(t2_meta, dict) else 0
                t2_projected = t2_meta.get("team_projected_points", {}).get("total", 0) if isinstance(t2_meta, dict) else 0
                
                matchups.append({
                    "week": week_num,
                    "team1": {
                        "team_key": t1_meta.get("team_key"),
                        "name": t1_meta.get("name"),
                        "points": float(t1_points or 0),
                        "projected": float(t1_projected or 0)
                    },
                    "team2": {
                        "team_key": t2_meta.get("team_key"),
                        "name": t2_meta.get("name"),
                        "points": float(t2_points or 0),
                        "projected": float(t2_projected or 0)
                    },
                    "is_completed": m_raw.get("status") == "postevent",
                    "winner_team_key": m_raw.get("winner_team_key")
                })
            return {"week": week_num, "matchups": matchups}
        except Exception as e:
            print(f"Error parsing league scoreboard: {e}")
            return {"week": week or 1, "matchups": []}

    def get_player_game_logs(self, league_key: str, player_key: str, num_weeks: int = 18) -> Dict[str, Any]:
        """Fetch weekly stat history and points breakdown for a specific player."""
        weeks_str = ",".join(str(w) for w in range(1, num_weeks + 1))
        res = self._get(f"league/{league_key}/players;player_keys={player_key}/stats;type=week;week={weeks_str}")
        game_logs = []
        player_info = {"player_key": player_key, "name": "Player"}
        try:
            def _walk_stats(obj):
                nonlocal player_info
                if isinstance(obj, dict):
                    if "player_key" in obj and "name" in obj:
                        name_val = obj.get("name", {})
                        full_name = name_val.get("full") if isinstance(name_val, dict) else str(name_val)
                        headshot_url = obj.get("headshot", {}).get("url", "") if isinstance(obj.get("headshot"), dict) else ""
                        player_info = {
                            "player_key": obj.get("player_key"),
                            "name": full_name,
                            "position": obj.get("primary_position", "FLEX"),
                            "nfl_team": obj.get("editorial_team_abbr", "FA"),
                            "headshot_url": headshot_url
                        }
                    if "stat_id" in obj and "value" in obj:
                        game_logs.append({
                            "stat_id": obj.get("stat_id"),
                            "value": obj.get("value")
                        })
                    for v in obj.values():
                        _walk_stats(v)
                elif isinstance(obj, list):
                    for item in obj:
                        _walk_stats(item)

            _walk_stats(res.get("fantasy_content", {}))
        except Exception as e:
            print(f"Error fetching player game logs: {e}")
        return {"player": player_info, "stats": game_logs}

yahoo_client = YahooFantasyClient()
