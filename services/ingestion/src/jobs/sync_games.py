from src.clients.nba import CURRENT_SEASON, get_league_games, season_date_range
from src.clients.supabase import get_supabase_client
from datetime import date, datetime, timedelta


def cleanup_balldontlie_duplicates(client, nba_games: list[dict]) -> int:
    """
    Para cada partido NBA, busca duplicados con ID 'bdl_*' que representen
    el mismo partido (mismos equipos, fecha en rango ±1 día) y los borra.
    
    La búsqueda con margen de 1 día compensa que nba_api y balldontlie usan
    zonas horarias distintas (ET vs UTC), lo que puede hacer que el mismo
    partido aparezca en días "calendario" diferentes.
    """
    deleted_count = 0

    for game in nba_games:
        home_id = game["home_team_id"]
        away_id = game["away_team_id"]
        starts_at = game["starts_at"]

        # Extraer fecha del partido NBA
        if isinstance(starts_at, str):
            try:
                # Intentar parsear con timezone
                game_dt = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
            except Exception:
                # Fallback: tomar solo la fecha
                game_dt = datetime.strptime(starts_at[:10], "%Y-%m-%d")
        else:
            game_dt = starts_at

        # Rango de búsqueda: ±1 día desde el partido NBA
        date_start = (game_dt - timedelta(days=1)).strftime("%Y-%m-%d")
        date_end = (game_dt + timedelta(days=1)).strftime("%Y-%m-%d")

        # Buscar partidos bdl_* con los mismos equipos en el rango
        result = (
            client.table("games")
            .select("id, starts_at")
            .like("id", "bdl_%")
            .eq("home_team_id", home_id)
            .eq("away_team_id", away_id)
            .gte("starts_at", f"{date_start}T00:00:00")
            .lte("starts_at", f"{date_end}T23:59:59")
            .execute()
        )

        for row in result.data:
            client.table("games").delete().eq("id", row["id"]).execute()
            print(f"   🗑️  Eliminado duplicado balldontlie: {row['id']}")
            deleted_count += 1

    return deleted_count


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
    print(f"   {len(filtered)} partidos con equipos válidos")

    # Limpieza de duplicados balldontlie ANTES de insertar los NBA
    print("   Buscando duplicados de balldontlie...")
    deleted = cleanup_balldontlie_duplicates(client, filtered)
    if deleted > 0:
        print(f"   {deleted} duplicados balldontlie eliminados")
    else:
        print("   Sin duplicados que eliminar")

    # Upsert por lotes de 500 para no exceder límites
    batch_size = 500
    total = 0
    for i in range(0, len(filtered), batch_size):
        batch = filtered[i : i + batch_size]
        result = client.table("games").upsert(batch).execute()
        total += len(result.data)

    print(f"✅ {total} partidos sincronizados")


if __name__ == "__main__":
    import sys

    # Por defecto la temporada actual completa.
    #   --days N      solo los ultimos N dias
    #   --season X    otra temporada ("2025-26")
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else None
    temporada = (
        sys.argv[sys.argv.index("--season") + 1]
        if "--season" in sys.argv
        else CURRENT_SEASON
    )
    sync_games(days_back=days, season=temporada)