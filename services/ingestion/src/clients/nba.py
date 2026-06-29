from nba_api.stats.static import teams as nba_teams_static
from nba_api.stats.endpoints import commonteamroster
from nba_api.stats.endpoints import leaguedashplayerstats
from nba_api.stats.endpoints import playergamelog
from nba_api.stats.endpoints import leaguegamefinder
from nba_api.stats.endpoints import scoreboardv2
from nba_api.stats.endpoints import boxscoretraditionalv2
from datetime import datetime
import time
from nba_api.stats.library.http import NBAStatsHTTP

CURRENT_SEASON = "2026-27"

REQUEST_DELAY = 1.5

def build_team_logo_url(abbreviation: str) -> str:
    """URL del logo del equipo (PNG vía ESPN CDN) con parseo de excepciones."""
    abbr_lower = abbreviation.lower()
    
    espn_exceptions = {
        "uta": "utah",
        "nop": "no"
    }

    final_abbr = espn_exceptions.get(abbr_lower, abbr_lower)

    return f"https://a.espncdn.com/i/teamlogos/nba/500/{final_abbr}.png"


def build_player_photo_url(player_id: str) -> str:
    """URL de la foto del jugador (PNG transparente, NBA CDN)."""
    return f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png"

def get_team_roster(team_id: str, season: str = CURRENT_SEASON) -> list[dict]:
    """Obtiene la plantilla de un equipo."""
    roster = commonteamroster.CommonTeamRoster(
        team_id=int(team_id),
        season=season,
        timeout=30,
    )
    df = roster.get_data_frames()[0]

    players = []
    for _, row in df.iterrows():
        full_name = str(row["PLAYER"]).strip()
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        # El dorsal a veces viene vacío o como NaN
        jersey = str(row.get("NUM", "")).strip()
        if jersey in ("", "nan", "None"):
            jersey = None

        position = str(row.get("POSITION", "")).strip() or None

        players.append(
            {
                "id": str(row["PLAYER_ID"]),
                "team_id": str(team_id),
                "first_name": first_name,
                "last_name": last_name,
                "position": position,
                "jersey_number": jersey,
                "photo_url": build_player_photo_url(str(row["PLAYER_ID"])),
                "is_active": True,
            }
        )

    return players


def get_all_rosters(team_ids: list[str], season: str = CURRENT_SEASON) -> list[dict]:
    """Recorre todos los equipos con pausas entre peticiones."""
    all_players = []

    for i, team_id in enumerate(team_ids, start=1):
        print(f"   [{i}/{len(team_ids)}] Obteniendo plantilla del equipo {team_id}...")
        try:
            players = get_team_roster(team_id, season)
            all_players.extend(players)
            print(f"        → {len(players)} jugadores")
        except Exception as e:
            print(f"        Error con el equipo {team_id}: {e}")

        # Pausa entre peticiones (excepto en la última)
        if i < len(team_ids):
            time.sleep(REQUEST_DELAY)

    return all_players

TEAM_METADATA: dict[int, dict[str, str]] = {
    # Conferencia Este - División Atlántico
    1610612738: {"conference": "East", "division": "Atlantic"},   # Celtics
    1610612751: {"conference": "East", "division": "Atlantic"},   # Nets
    1610612752: {"conference": "East", "division": "Atlantic"},   # Knicks
    1610612755: {"conference": "East", "division": "Atlantic"},   # 76ers
    1610612761: {"conference": "East", "division": "Atlantic"},   # Raptors
    # Conferencia Este - División Central
    1610612741: {"conference": "East", "division": "Central"},    # Bulls
    1610612739: {"conference": "East", "division": "Central"},    # Cavaliers
    1610612765: {"conference": "East", "division": "Central"},    # Pistons
    1610612754: {"conference": "East", "division": "Central"},    # Pacers
    1610612749: {"conference": "East", "division": "Central"},    # Bucks
    # Conferencia Este - División Sureste
    1610612737: {"conference": "East", "division": "Southeast"},  # Hawks
    1610612766: {"conference": "East", "division": "Southeast"},  # Hornets
    1610612748: {"conference": "East", "division": "Southeast"},  # Heat
    1610612753: {"conference": "East", "division": "Southeast"},  # Magic
    1610612764: {"conference": "East", "division": "Southeast"},  # Wizards
    # Conferencia Oeste - División Noroeste
    1610612743: {"conference": "West", "division": "Northwest"},  # Nuggets
    1610612750: {"conference": "West", "division": "Northwest"},  # Timberwolves
    1610612760: {"conference": "West", "division": "Northwest"},  # Thunder
    1610612757: {"conference": "West", "division": "Northwest"},  # Trail Blazers
    1610612762: {"conference": "West", "division": "Northwest"},  # Jazz
    # Conferencia Oeste - División Pacífico
    1610612744: {"conference": "West", "division": "Pacific"},    # Warriors
    1610612746: {"conference": "West", "division": "Pacific"},    # Clippers
    1610612747: {"conference": "West", "division": "Pacific"},    # Lakers
    1610612756: {"conference": "West", "division": "Pacific"},    # Suns
    1610612758: {"conference": "West", "division": "Pacific"},    # Kings
    # Conferencia Oeste - División Suroeste
    1610612742: {"conference": "West", "division": "Southwest"},  # Mavericks
    1610612745: {"conference": "West", "division": "Southwest"},  # Rockets
    1610612763: {"conference": "West", "division": "Southwest"},  # Grizzlies
    1610612740: {"conference": "West", "division": "Southwest"},  # Pelicans
    1610612759: {"conference": "West", "division": "Southwest"},  # Spurs
}


def get_all_teams() -> list[dict]:
    """Devuelve los equipos de la NBA enriquecidos con conferencia, división y logo."""
    raw_teams = nba_teams_static.get_teams()
    enriched = []

    for team in raw_teams:
        meta = TEAM_METADATA.get(team["id"], {"conference": "East", "division": None})
        enriched.append(
            {
                "id": str(team["id"]),
                "name": team["nickname"],
                "full_name": team["full_name"],
                "abbreviation": team["abbreviation"],
                "city": team["city"],
                "conference": meta["conference"],
                "division": meta["division"],
                "logo_url": build_team_logo_url(team["abbreviation"]),
            }
        )

    return enriched

def get_season_stats(season: str = CURRENT_SEASON) -> list[dict]:
    """Obtiene las medias de temporada de todos los jugadores en una sola llamada."""
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        per_mode_detailed="PerGame",
        timeout=30,
    )
    df = stats.get_data_frames()[0]

    results = []
    for _, row in df.iterrows():
        results.append(
            {
                "player_id": str(row["PLAYER_ID"]),
                "season": season,
                "games_played": int(row["GP"]),
                "minutes": round(float(row["MIN"]), 1),
                "points": round(float(row["PTS"]), 1),
                "rebounds": round(float(row["REB"]), 1),
                "assists": round(float(row["AST"]), 1),
                "steals": round(float(row["STL"]), 1),
                "blocks": round(float(row["BLK"]), 1),
                "field_goal_pct": round(float(row["FG_PCT"]), 3),
                "three_point_pct": round(float(row["FG3_PCT"]), 3),
                "free_throw_pct": round(float(row["FT_PCT"]), 3),
            }
        )

    return results

def get_player_game_log(player_id: str, season: str = CURRENT_SEASON) -> list[dict]:
    """Obtiene el historial de partidos de un jugador en una temporada."""
    log = playergamelog.PlayerGameLog(
        player_id=int(player_id),
        season=season,
        timeout=30,
    )
    df = log.get_data_frames()[0]

    games = []
    for _, row in df.iterrows():
        matchup = str(row["MATCHUP"])
        is_home = "vs." in matchup

        opponent = None
        if "vs." in matchup:
            opponent = matchup.split("vs.")[-1].strip()
        elif "@" in matchup:
            opponent = matchup.split("@")[-1].strip()

        games.append(
            {
                "player_id": str(player_id),
                "game_id": str(row["Game_ID"]),
                "game_date": str(row["GAME_DATE"]),
                "season": season,
                "matchup": matchup,
                "is_home": is_home,
                "opponent_abbreviation": opponent,
                "win_loss": str(row["WL"]) if row.get("WL") else None,
                "minutes": float(row["MIN"]) if row.get("MIN") else 0,
                "points": int(row["PTS"]),
                "rebounds": int(row["REB"]),
                "assists": int(row["AST"]),
                "steals": int(row["STL"]),
                "blocks": int(row["BLK"]),
                "turnovers": int(row["TOV"]),
                "fg_made": int(row["FGM"]),
                "fg_attempted": int(row["FGA"]),
                "fg3_made": int(row["FG3M"]),
                "fg3_attempted": int(row["FG3A"]),
                "ft_made": int(row["FTM"]),
                "ft_attempted": int(row["FTA"]),
                "plus_minus": int(row["PLUS_MINUS"]) if row.get("PLUS_MINUS") else 0,
            }
        )

    return games

def get_league_games(season: str = CURRENT_SEASON) -> list[dict]:
    """Obtiene todos los partidos de la temporada con su marcador."""
    finder = leaguegamefinder.LeagueGameFinder(
        season_nullable=season,
        league_id_nullable="00",  # 00 = NBA
        timeout=60,
    )
    df = finder.get_data_frames()[0]

    # Cada partido aparece una fila por equipo. Agrupamos por GAME_ID.
    games_by_id: dict[str, dict] = {}

    for _, row in df.iterrows():
        game_id = str(row["GAME_ID"])
        matchup = str(row["MATCHUP"])
        is_home = "vs." in matchup
        team_id = str(row["TEAM_ID"])
        pts = int(row["PTS"]) if row.get("PTS") is not None else 0

        if game_id not in games_by_id:
            games_by_id[game_id] = {
                "id": game_id,
                "starts_at": str(row["GAME_DATE"]),
                "season": season,
                "home_team_id": None,
                "away_team_id": None,
                "score_home": 0,
                "score_away": 0,
                "status": "final",
            }

        entry = games_by_id[game_id]
        if is_home:
            entry["home_team_id"] = team_id
            entry["score_home"] = pts
        else:
            entry["away_team_id"] = team_id
            entry["score_away"] = pts

    # Solo partidos con ambos equipos identificados
    return [
        g for g in games_by_id.values()
        if g["home_team_id"] and g["away_team_id"]
    ]

def get_scoreboard_for_date(date: datetime, season: str = CURRENT_SEASON) -> list[dict]:
    """Obtiene los partidos programados para una fecha concreta."""
    date_str = date.strftime("%m/%d/%Y")
    board = scoreboardv2.ScoreboardV2(game_date=date_str, timeout=30)
    game_header = board.game_header.get_data_frame()
    line_score = board.line_score.get_data_frame()

    # Indexamos las puntuaciones por game_id
    scores_by_game: dict[str, dict] = {}
    for _, row in line_score.iterrows():
        gid = str(row["GAME_ID"])
        if gid not in scores_by_game:
            scores_by_game[gid] = {}
        team_id = str(row["TEAM_ID"])
        scores_by_game[gid][team_id] = int(row["PTS"]) if row.get("PTS") else 0

    games = []
    for _, row in game_header.iterrows():
        game_id = str(row["GAME_ID"])
        home_id = str(row["HOME_TEAM_ID"])
        away_id = str(row["VISITOR_TEAM_ID"])

        # Estado: GAME_STATUS_ID 1=scheduled, 2=live, 3=final
        status_id = int(row["GAME_STATUS_ID"])
        status = {1: "scheduled", 2: "live", 3: "final"}.get(status_id, "scheduled")

        scores = scores_by_game.get(game_id, {})

        games.append({
            "id": game_id,
            "home_team_id": home_id,
            "away_team_id": away_id,
            "starts_at": str(row["GAME_DATE_EST"]),
            "season": season,
            "status": status,
            "score_home": scores.get(home_id, 0),
            "score_away": scores.get(away_id, 0),
        })

    return games


def get_box_score(game_id: str) -> list[dict]:
    """
    Obtiene el box score de un partido: stats por jugador de ambos equipos.
    Una sola llamada trae los ~25-30 jugadores que participaron.
    """
    box = boxscoretraditionalv2.BoxScoreTraditionalV2(
        game_id=game_id,
        timeout=30,
    )
    df = box.player_stats.get_data_frame()

    entries = []
    for _, row in df.iterrows():
        # Si el jugador no jugó (DNP), MIN viene como None
        min_str = row.get("MIN")
        if not min_str or str(min_str).strip() in ("", "nan", "None"):
            minutes = 0.0
        else:
            # MIN viene como "MM:SS" o "MM"; convertimos a float decimal
            min_str = str(min_str)
            if ":" in min_str:
                parts = min_str.split(":")
                minutes = float(parts[0]) + float(parts[1]) / 60
            else:
                minutes = float(min_str)

        def _int(field: str) -> int:
            val = row.get(field)
            return int(val) if val is not None and str(val) != "nan" else 0

        entries.append({
            "player_id": str(row["PLAYER_ID"]),
            "game_id": str(game_id),
            "minutes": round(minutes, 1),
            "points": _int("PTS"),
            "rebounds": _int("REB"),
            "assists": _int("AST"),
            "steals": _int("STL"),
            "blocks": _int("BLK"),
            "turnovers": _int("TO"),
            "fg_made": _int("FGM"),
            "fg_attempted": _int("FGA"),
            "fg3_made": _int("FG3M"),
            "fg3_attempted": _int("FG3A"),
            "ft_made": _int("FTM"),
            "ft_attempted": _int("FTA"),
            "plus_minus": _int("PLUS_MINUS"),
        })

    return entries