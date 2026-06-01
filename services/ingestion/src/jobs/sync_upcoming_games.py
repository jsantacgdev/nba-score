import time
from datetime import datetime, timedelta

from src.clients.nba import get_scoreboard_for_date
from src.clients.supabase import get_supabase_client


MAX_RETRIES = 3
RETRY_DELAY = 5  # segundos


def fetch_with_retry(date):
    """Intenta obtener el scoreboard con reintentos exponenciales."""
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return get_scoreboard_for_date(date)
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                wait = RETRY_DELAY * attempt
                print(f"        ⚠️  Intento {attempt} falló ({e}). Esperando {wait}s...")
                time.sleep(wait)
    raise last_error


def sync_upcoming_games(days_ahead: int = 7, days_back: int = 2) -> None:
    """Carga partidos de los últimos N días y los próximos M días."""
    total_days = days_back + days_ahead + 1
    print(f"Sincronizando {total_days} días de partidos "
          f"(-{days_back} a +{days_ahead})...")

    client = get_supabase_client()
    teams = client.table("teams").select("id").execute()
    valid_ids = {row["id"] for row in teams.data}

    total = 0
    errors = 0
    today = datetime.now()

    for offset in range(-days_back, days_ahead + 1):
        date = today + timedelta(days=offset)
        date_label = date.strftime("%Y-%m-%d")
        print(f"   📅 {date_label}...")
        try:
            games = fetch_with_retry(date)
            filtered = [
                g for g in games
                if g["home_team_id"] in valid_ids and g["away_team_id"] in valid_ids
            ]
            if filtered:
                client.table("games").upsert(filtered).execute()
                total += len(filtered)
                print(f"        → {len(filtered)} partidos")
            else:
                print("        → sin partidos")
        except Exception as e:
            errors += 1
            print(f"        ❌ Error tras {MAX_RETRIES} intentos: {e}")

        # Pausa pequeña entre días para no saturar
        time.sleep(1)

    print(f"\n✅ {total} partidos sincronizados")
    if errors:
        print(f"   ⚠️  {errors} días fallaron")


if __name__ == "__main__":
    sync_upcoming_games(days_ahead=7, days_back=2)