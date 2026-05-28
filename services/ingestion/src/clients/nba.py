from nba_api.stats.static import teams as nba_teams_static
import time
from nba_api.stats.endpoints import commonteamroster

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