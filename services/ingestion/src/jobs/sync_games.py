from datetime import date, datetime, timedelta

from src.clients.nba import CURRENT_SEASON, get_league_games, season_date_range
from src.clients.supabase import get_supabase_client


def _day(value) -> date | None:
    """Fecha de un partido, venga como timestamptz de Supabase o como texto."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def cleanup_balldontlie_duplicates(client, nba_games: list[dict], season: str) -> int:
    """
    Borra los partidos 'bdl_*' que duplican a uno traido de nba_api.

    El cruce se hace en memoria: antes esto lanzaba un SELECT por partido,
    unos 1300 viajes a Supabase por temporada. Ahora es una sola consulta.

    Se mantiene el margen de +-1 dia porque nba_api y balldontlie usan zonas
    horarias distintas (ET vs UTC) y el mismo partido puede caer en dias
    "calendario" diferentes segun la fuente.
    """
    existing = (
        client.table("games")
        .select("id, home_team_id, away_team_id, starts_at")
        .like("id", "bdl_%")
        .eq("season", season)
        .execute()
    )
    if not existing.data:
        return 0

    # Indice (local, visitante, dia) -> ids de balldontlie
    index: dict[tuple, list[str]] = {}
    for row in existing.data:
        day = _day(row["starts_at"])
        if day is None:
            continue
        key = (row["home_team_id"], row["away_team_id"], day)
        index.setdefault(key, []).append(row["id"])

    to_delete: set[str] = set()
    for game in nba_games:
        day = _day(game["starts_at"])
        if day is None:
            continue
        for offset in (-1, 0, 1):
            key = (
                game["home_team_id"],
                game["away_team_id"],
                day + timedelta(days=offset),
            )
            to_delete.update(index.get(key, []))

    if not to_delete:
        return 0

    ids = sorted(to_delete)
    for i in range(0, len(ids), 100):
        client.table("games").delete().in_("id", ids[i : i + 100]).execute()

    return len(ids)


def sync_games(days_back: int | None = None, season: str = CURRENT_SEASON) -> None:
    """
    Sincroniza los partidos ya jugados de una temporada.

    Args:
        days_back: Si se indica, sincroniza solo los ultimos N dias en lugar
                   de la temporada completa. Util para el sync diario.
        season: Temporada a sincronizar. Por defecto la actual, pero admite
                temporadas pasadas para tapar huecos ('2025-26').
    """
    if days_back is not None:
        date_to = date.today()
        date_from = date_to - timedelta(days=days_back)
    else:
        date_from, date_to = season_date_range(season)

    print(f"Sincronizando partidos de la temporada {season} "
          f"de {date_from} a {date_to}...")

    games = get_league_games(season, date_from, date_to)
    print(f"   {len(games)} partidos obtenidos")

    if not games:
        print("No hay partidos jugados en ese rango.")
        print("   (Este endpoint solo devuelve partidos ya disputados; "
              "el calendario futuro lo trae sync_upcoming_games.)")
        return

    client = get_supabase_client()

    # Validamos que los equipos existen para no romper la foreign key
    teams = client.table("teams").select("id").execute()
    valid_ids = {row["id"] for row in teams.data}
    filtered = [
        g for g in games
        if g["home_team_id"] in valid_ids and g["away_team_id"] in valid_ids
    ]
    print(f"   {len(filtered)} partidos con equipos validos")

    # Limpieza de duplicados balldontlie ANTES de insertar los NBA
    deleted = cleanup_balldontlie_duplicates(client, filtered, season)
    if deleted > 0:
        print(f"   {deleted} duplicados de balldontlie eliminados")

    # Upsert por lotes de 500 para no exceder limites
    batch_size = 500
    total = 0
    for i in range(0, len(filtered), batch_size):
        batch = filtered[i : i + batch_size]
        result = client.table("games").upsert(batch).execute()
        total += len(result.data)

    print(f"✅ {total} partidos sincronizados en {season}")


def sync_seasons(first: str, last: str = CURRENT_SEASON) -> None:
    """Recorre un rango de temporadas. Los upserts hacen que sea reejecutable."""
    from src.clients.nba import season_range

    seasons = season_range(first, last)
    print(f"Sincronizando {len(seasons)} temporadas: {seasons[0]} -> {seasons[-1]}\n")

    for i, season in enumerate(seasons, start=1):
        print(f"===== [{i}/{len(seasons)}] =====")
        try:
            sync_games(season=season)
        except Exception as e:
            print(f"   Error en {season}: {e}")
        print()

    print("Completado.")


if __name__ == "__main__":
    import sys

    def _flag(name: str, default=None):
        return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

    # --from X    recorre desde esa temporada hasta la actual
    # --season X  solo esa temporada
    # --days N    solo los ultimos N dias de la temporada actual
    desde = _flag("--from")
    if desde:
        sync_seasons(desde, _flag("--to", CURRENT_SEASON))
    else:
        days = int(_flag("--days")) if "--days" in sys.argv else None
        sync_games(days_back=days, season=_flag("--season", CURRENT_SEASON))
