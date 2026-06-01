from datetime import datetime, timedelta

from src.clients.balldontlie import get_games_for_date_range
from src.clients.supabase import get_supabase_client


CURRENT_SEASON = "2025-26"


def sync_upcoming_games(days_ahead: int = 7, days_back: int = 2) -> None:
    """Carga partidos de los últimos N días y los próximos M días usando balldontlie."""
    total_days = days_back + days_ahead + 1
    print(f"Sincronizando {total_days} días de partidos "
          f"(-{days_back} a +{days_ahead})...")

    client = get_supabase_client()
    teams = client.table("teams").select("id").execute()
    valid_ids = {row["id"] for row in teams.data}

    today = datetime.now()
    start_date = today - timedelta(days=days_back)
    end_date = today + timedelta(days=days_ahead)

    print(f"   Rango: {start_date.date()} a {end_date.date()}")

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

    batch_size = 500
    total = 0
    for i in range(0, len(filtered), batch_size):
        batch = filtered[i : i + batch_size]
        result = client.table("games").upsert(batch).execute()
        total += len(result.data)

    print(f"\n{total} partidos sincronizados")


if __name__ == "__main__":
    sync_upcoming_games(days_ahead=7, days_back=2)