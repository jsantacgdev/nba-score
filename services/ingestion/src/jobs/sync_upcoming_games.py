from datetime import datetime, timedelta, timezone

from src.clients.nba import CURRENT_SEASON, get_season_schedule
from src.clients.supabase import get_supabase_client
from src.jobs.sync_games import cleanup_balldontlie_duplicates

def _fecha(valor: str) -> datetime | None:
    try:
        return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None

def sync_upcoming_games(
    days_ahead: int = 60,
    days_back: int = 7,
    full_season: bool = False,
) -> None:
    client = get_supabase_client()
    valid_ids = {row["id"] for row in client.table("teams").select("id").execute().data}

    try:
        partidos = get_season_schedule(CURRENT_SEASON)
    except Exception as e:
        print(f"Error: {e}")
        return

    if full_season:
        print(f"Sincronizando la temporada {CURRENT_SEASON} completa...")
    else:
        ahora = datetime.now(timezone.utc)
        desde = ahora - timedelta(days=days_back)
        hasta = ahora + timedelta(days=days_ahead)
        print(f"Sincronizando partidos de {desde.date()} a {hasta.date()} "
              f"(-{days_back}/+{days_ahead} dias)...")
        partidos = [
            g for g in partidos
            if (f := _fecha(g["starts_at"])) is not None and desde <= f <= hasta
        ]

    print(f"   {len(partidos)} partidos obtenidos")

    filtrados = [
        g for g in partidos
        if g["home_team_id"] in valid_ids and g["away_team_id"] in valid_ids
    ]
    if not filtrados:
        print("Sin partidos para insertar.")
        return

    por_estado: dict[str, int] = {}
    for g in filtrados:
        por_estado[g["status"]] = por_estado.get(g["status"], 0) + 1
    print(f"   Desglose: {por_estado}")

    total = 0
    for i in range(0, len(filtrados), 500):
        result = client.table("games").upsert(filtrados[i : i + 500]).execute()
        total += len(result.data)

    borrados = cleanup_balldontlie_duplicates(client, filtrados, CURRENT_SEASON)

    print(f"\n{total} partidos sincronizados")
    if borrados:
        print(f"   {borrados} duplicados de balldontlie eliminados")

if __name__ == "__main__":
    import sys

    def _arg(flag: str, default: int) -> int:
        return int(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default

    sync_upcoming_games(
        days_ahead=_arg("--days-ahead", 60),
        days_back=_arg("--days-back", 7),
        full_season="--season" in sys.argv,
    )
