import time
from datetime import datetime
from typing import Optional

import httpx

from src.config import config

BASE_URL = "https://api.balldontlie.io/v1"

# El plan gratuito permite 5 peticiones/minuto. Al paginar una temporada
# entera nos pasamos de largo, asi que respetamos las cabeceras de cuota.
MAX_RETRIES = 5


# Mapeo de IDs de balldontlie a los IDs de nba_api en nuestra BD
BDL_TO_NBA_TEAM_ID: dict[int, str] = {
    1: "1610612737",   # Atlanta Hawks
    2: "1610612738",   # Boston Celtics
    3: "1610612751",   # Brooklyn Nets
    4: "1610612766",   # Charlotte Hornets
    5: "1610612741",   # Chicago Bulls
    6: "1610612739",   # Cleveland Cavaliers
    7: "1610612742",   # Dallas Mavericks
    8: "1610612743",   # Denver Nuggets
    9: "1610612765",   # Detroit Pistons
    10: "1610612744",  # Golden State Warriors
    11: "1610612745",  # Houston Rockets
    12: "1610612754",  # Indiana Pacers
    13: "1610612746",  # LA Clippers
    14: "1610612747",  # Los Angeles Lakers
    15: "1610612763",  # Memphis Grizzlies
    16: "1610612748",  # Miami Heat
    17: "1610612749",  # Milwaukee Bucks
    18: "1610612750",  # Minnesota Timberwolves
    19: "1610612740",  # New Orleans Pelicans
    20: "1610612752",  # New York Knicks
    21: "1610612760",  # Oklahoma City Thunder
    22: "1610612753",  # Orlando Magic
    23: "1610612755",  # Philadelphia 76ers
    24: "1610612756",  # Phoenix Suns
    25: "1610612757",  # Portland Trail Blazers
    26: "1610612758",  # Sacramento Kings
    27: "1610612759",  # San Antonio Spurs
    28: "1610612761",  # Toronto Raptors
    29: "1610612762",  # Utah Jazz
    30: "1610612764",  # Washington Wizards
}


def _get_headers() -> dict:
    if not config.BALLDONTLIE_API_KEY:
        raise RuntimeError(
            "BALLDONTLIE_API_KEY no configurada. Añádela al .env "
            "o al secret de GitHub Actions."
        )
    return {"Authorization": config.BALLDONTLIE_API_KEY}


def _get(url: str, headers: dict, params: dict) -> httpx.Response:
    """GET que respeta el rate limit: reintenta los 429 y frena antes de agotar la cuota."""
    for attempt in range(1, MAX_RETRIES + 1):
        response = httpx.get(url, headers=headers, params=params, timeout=30)

        if response.status_code == 429:
            if attempt == MAX_RETRIES:
                response.raise_for_status()
            wait = int(response.headers.get("retry-after", 60))
            print(f"   Rate limit alcanzado, esperando {wait}s "
                  f"(intento {attempt}/{MAX_RETRIES})...")
            time.sleep(wait + 1)
            continue

        response.raise_for_status()

        # Si esta peticion agoto la cuota, esperamos al reset antes de seguir
        if response.headers.get("x-ratelimit-remaining") == "0":
            reset = response.headers.get("x-ratelimit-reset", "")
            wait = 60
            if reset.isdigit():
                wait = max(0, int(reset) - int(time.time())) + 1
            if wait > 0:
                print(f"   Cuota agotada, esperando {wait}s hasta el reset...")
                time.sleep(wait)

        return response

    raise RuntimeError("Rate limit de balldontlie: agotados todos los reintentos")


def _map_game_to_internal(game: dict, season: str) -> Optional[dict]:
    """Convierte un partido de balldontlie al formato de nuestra BD."""
    if not game.get("home_team") or not game.get("visitor_team"):
        return None

    home_team_id = BDL_TO_NBA_TEAM_ID.get(game["home_team"]["id"])
    away_team_id = BDL_TO_NBA_TEAM_ID.get(game["visitor_team"]["id"])
    if not home_team_id or not away_team_id:
        return None

    # Detectar status
    raw_status = (game.get("status") or "").lower()
    if "final" in raw_status:
        status = "final"
    elif game.get("period") and game.get("period") > 0:
        status = "live"
    else:
        status = "scheduled"

    return {
        "id": f"bdl_{game['id']}",
        "home_team_id": home_team_id,
        "away_team_id": away_team_id,
        "starts_at": game.get("datetime") or game.get("date"),
        "season": season,
        "status": status,
        "score_home": game.get("home_team_score") or 0,
        "score_away": game.get("visitor_team_score") or 0,
        # balldontlie no publica pretemporada, solo marca los de playoffs
        "season_type": "playoffs" if game.get("postseason") else "regular",
    }


def get_games_for_date_range(
    start_date: datetime, end_date: datetime, season: str
) -> list[dict]:
    """Obtiene partidos en un rango de fechas. Una sola petición con paginación."""
    headers = _get_headers()
    params = {
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "per_page": 100,
    }

    all_games: list[dict] = []
    cursor = None
    page = 0

    while True:
        if cursor:
            params["cursor"] = cursor

        page += 1
        response = _get(f"{BASE_URL}/games", headers, params)
        data = response.json()
        print(f"   pagina {page}: {len(data.get('data', []))} partidos")

        for raw_game in data.get("data", []):
            mapped = _map_game_to_internal(raw_game, season)
            if mapped:
                all_games.append(mapped)

        meta = data.get("meta", {})
        next_cursor = meta.get("next_cursor")
        if not next_cursor:
            break
        cursor = next_cursor

    return all_games