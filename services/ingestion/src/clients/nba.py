import time
from nba_api.stats.static import teams as nba_teams_static
from nba_api.stats.endpoints import commonteamroster
from nba_api.stats.endpoints import leaguedashplayerstats
from nba_api.stats.endpoints import playergamelog


# Temporada actual. Ajusta si cambia.
CURRENT_SEASON = "2025-26"

# Pausa entre peticiones para no saturar stats.nba.com (en segundos)
REQUEST_DELAY = 1.5

def build_team_logo_url(abbreviation: str) -> str:
    """URL del logo del equipo (PNG vía ESPN CDN)."""
    return f"https://a.espncdn.com/i/teamlogos/nba/500/{abbreviation.lower()}.png"


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
            print(f"        ⚠️  Error con el equipo {team_id}: {e}")

        # Pausa entre peticiones (excepto en la última)
        if i < len(team_ids):
            time.sleep(REQUEST_DELAY)

    return all_players

# Mapeo de equipos a conferencia y división (datos fijos de la NBA)
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
        matchup = str(row["MATCHUP"])  # ej. "LAL vs. BOS" o "LAL @ BOS"
        is_home = "vs." in matchup

        # Extraer abreviatura del rival
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