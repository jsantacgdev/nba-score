from datetime import datetime, timedelta, timezone

from src.clients.nba import CURRENT_SEASON, get_season_schedule
from src.clients.supabase import get_supabase_client
from src.jobs.sync_games import cleanup_balldontlie_duplicates


def _fecha(valor: str) -> datetime | None:
    """La NBA publica el inicio en UTC con Z final."""
    try:
        return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def sync_upcoming_games(
    days_ahead: int = 60,
    days_back: int = 7,
    full_season: bool = False,
) -> None:
    """
    Carga partidos recientes y futuros desde el calendario de la NBA.

    Es el unico job que trae calendario futuro: LeagueGameLog solo devuelve
    partidos ya jugados, asi que sin esto la app no tiene proximos partidos
    que mostrar.

    Antes tiraba de balldontlie, que numera los partidos a su manera
    ('bdl_21717855'). Eso obligaba a mantener dos numeraciones en la misma
    tabla y a borrar duplicados cuando el partido se jugaba y llegaba por
    nba_api con su identificador real. Con ScheduleLeagueV2 el identificador
    ya es el definitivo desde que el partido se anuncia, asi que la fila se
    actualiza sola al jugarse.

    Args:
        days_ahead: Dias hacia adelante desde hoy.
        days_back: Dias hacia atras, para refrescar marcadores recientes.
        full_season: Si True, ignora los dos anteriores y trae la temporada entera.
    """
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

    # Los que quedaban de balldontlie ya tienen su equivalente con
    # identificador de la NBA, asi que sobran.
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
