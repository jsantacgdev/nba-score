from datetime import datetime, timedelta

from src.clients.balldontlie import get_games_for_date_range
from src.clients.nba import CURRENT_SEASON, season_date_range
from src.clients.supabase import get_supabase_client


def sync_upcoming_games(
    days_ahead: int = 60,
    days_back: int = 7,
    full_season: bool = False,
) -> None:
    """
    Carga partidos recientes y futuros usando balldontlie.

    Es el unico job que trae calendario futuro: nba_api solo devuelve partidos
    ya jugados, asi que sin esto la app no tiene proximos partidos que mostrar.

    Args:
        days_ahead: Dias hacia adelante desde hoy.
        days_back: Dias hacia atras, para refrescar marcadores recientes.
        full_season: Si True, ignora los dos anteriores y trae la temporada entera.
    """
    if full_season:
        start, end = season_date_range(CURRENT_SEASON)
        start_date = datetime.combine(start, datetime.min.time())
        end_date = datetime.combine(end, datetime.min.time())
        print(f"Sincronizando la temporada {CURRENT_SEASON} completa, "
              f"de {start} a {end}...")
    else:
        today = datetime.now()
        start_date = today - timedelta(days=days_back)
        end_date = today + timedelta(days=days_ahead)
        print(f"Sincronizando partidos de {start_date.date()} a {end_date.date()} "
              f"(-{days_back}/+{days_ahead} dias)...")

    client = get_supabase_client()
    teams = client.table("teams").select("id").execute()
    valid_ids = {row["id"] for row in teams.data}

    try:
        games = get_games_for_date_range(start_date, end_date, CURRENT_SEASON)
    except Exception as e:
        print(f"Error: {e}")
        return

    print(f"   {len(games)} partidos obtenidos")

    filtered = [
        g for g in games
        if g["home_team_id"] in valid_ids and g["away_team_id"] in valid_ids
    ]

    if not filtered:
        print("Sin partidos para insertar.")
        return

    by_status: dict[str, int] = {}
    for g in filtered:
        by_status[g["status"]] = by_status.get(g["status"], 0) + 1
    print(f"   Desglose: {by_status}")

    batch_size = 500
    total = 0
    for i in range(0, len(filtered), batch_size):
        batch = filtered[i : i + batch_size]
        result = client.table("games").upsert(batch).execute()
        total += len(result.data)

    print(f"\n{total} partidos sincronizados")


if __name__ == "__main__":
    import sys

    def _arg(flag: str, default: int) -> int:
        return int(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default

    sync_upcoming_games(
        days_ahead=_arg("--days-ahead", 60),
        days_back=_arg("--days-back", 7),
        full_season="--season" in sys.argv,
    )
