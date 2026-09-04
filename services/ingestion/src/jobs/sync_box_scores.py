import time

from src.clients.nba import CURRENT_SEASON, REQUEST_DELAY, get_box_score
from src.clients.supabase import get_supabase_client


def get_games_with_box_scores(client) -> set[str]:
    """Devuelve el conjunto de game_ids que YA tienen box score cargado."""
    loaded: set[str] = set()
    page_size = 1000
    offset = 0

    while True:
        result = (
            client.table("player_game_log")
            .select("game_id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if not result.data:
            break
        for row in result.data:
            loaded.add(row["game_id"])
        if len(result.data) < page_size:
            break
        offset += page_size

    return loaded


def get_all_final_game_ids(
    client,
    exclude_preseason: bool = True,
    season: str | None = CURRENT_SEASON,
) -> list[str]:
    """
    Lista los game_ids con status='final', con paginación completa.

    Por defecto se limita a la temporada actual. La tabla guarda 26
    temporadas de histórico y recorrerlas todas son ~32.000 partidos, o
    sea unas 13 horas: eso hay que pedirlo a propósito, no por descuido.
    """
    ids: list[str] = []
    page_size = 1000
    offset = 0

    while True:
        query = (
            client.table("games")
            .select("id")
            .eq("status", "final")
        )
        if season:
            query = query.eq("season", season)
        result = (
            query
            .order("starts_at", desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if not result.data:
            break
        for row in result.data:
            game_id = row["id"]
            # IDs que empiezan por "001" son pretemporada
            if exclude_preseason and game_id.startswith("001"):
                continue
            if game_id.startswith("bdl_"):
                continue
            ids.append(game_id)
        if len(result.data) < page_size:
            break
        offset += page_size

    return ids


def get_existing_player_ids(client) -> set[str]:
    """Devuelve el conjunto de player_ids que existen en la tabla players."""
    ids: set[str] = set()
    page_size = 1000
    offset = 0

    while True:
        result = (
            client.table("players")
            .select("id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if not result.data:
            break
        for row in result.data:
            ids.add(row["id"])
        if len(result.data) < page_size:
            break
        offset += page_size

    return ids


def sync_box_scores(
    skip_existing: bool = True,
    exclude_preseason: bool = True,
    season: str | None = CURRENT_SEASON,
) -> None:
    """
    Recorre los partidos finalizados y carga sus box scores.
    Solo procesa partidos que aún no tengan stats.

    Args:
        skip_existing: Si True, ignora partidos que ya tienen box score.
        exclude_preseason: Si True, ignora partidos de pretemporada (IDs que empiezan por 001).
        season: Temporada a procesar. None recorre TODO el histórico (horas).
    """
    print("🏀 Sincronizando box scores...")

    client = get_supabase_client()

    # 1. Listar partidos finalizados (con paginación)
    all_game_ids = get_all_final_game_ids(
        client, exclude_preseason=exclude_preseason, season=season
    )
    if not all_game_ids:
        print("⚠️  No hay partidos finalizados en la base de datos.")
        return

    ambito = f"de {season}" if season else "de TODAS las temporadas"
    print(f"   {len(all_game_ids)} partidos finalizados {ambito}"
          + (" (excluyendo pretemporada)" if exclude_preseason else ""))

    # 2. Filtrar los que ya tienen box score
    pending_ids: list[str]
    if skip_existing:
        loaded = get_games_with_box_scores(client)
        print(f"   {len(loaded)} partidos ya tienen box score cargado")
        pending_ids = [gid for gid in all_game_ids if gid not in loaded]
    else:
        pending_ids = all_game_ids

    if not pending_ids:
        print("✅ Todo al día, no hay partidos por procesar.")
        return

    print(f"   {len(pending_ids)} partidos por procesar")

    # 3. Cargar player_ids válidos para filtrar jugadores desconocidos
    print("   Cargando lista de jugadores en BD...")
    valid_player_ids = get_existing_player_ids(client)
    print(f"   {len(valid_player_ids)} jugadores conocidos\n")

    # 4. Procesar cada partido
    total_entries = 0
    total_skipped = 0
    errors = 0

    for i, game_id in enumerate(pending_ids, start=1):
        print(f"   [{i}/{len(pending_ids)}] Partido {game_id}...")
        try:
            entries = get_box_score(game_id)
            if not entries:
                print("        → sin datos")
                if i < len(pending_ids):
                    time.sleep(REQUEST_DELAY)
                continue

            # Filtrar jugadores que no existen en la tabla players
            valid_entries = [e for e in entries if e["player_id"] in valid_player_ids]
            skipped = len(entries) - len(valid_entries)
            total_skipped += skipped

            if valid_entries:
                client.table("player_game_log").upsert(valid_entries).execute()
                total_entries += len(valid_entries)
                msg = f"        → {len(valid_entries)} jugadores"
                if skipped > 0:
                    msg += f" ({skipped} ignorados, no están en plantilla)"
                print(msg)
            else:
                print(f"        ⚠️  Ningún jugador válido ({skipped} desconocidos)")
        except Exception as e:
            errors += 1
            print(f"        ⚠️  Error: {e}")

        if i < len(pending_ids):
            time.sleep(REQUEST_DELAY)

    print(f"\n✅ Completado.")
    print(f"   Partidos procesados: {len(pending_ids) - errors}")
    print(f"   Entradas insertadas: {total_entries}")
    if total_skipped > 0:
        print(f"   Jugadores ignorados: {total_skipped}")
    if errors:
        print(f"   ⚠️  Errores: {errors}")


if __name__ == "__main__":
    import sys

    skip = "--all" not in sys.argv
    include_preseason = "--include-preseason" in sys.argv

    #   (sin flags)          solo la temporada actual
    #   --season 2015-16     una temporada concreta
    #   --all-seasons        todo el historico (horas)
    if "--all-seasons" in sys.argv:
        temporada = None
    elif "--season" in sys.argv:
        temporada = sys.argv[sys.argv.index("--season") + 1]
    else:
        temporada = CURRENT_SEASON

    sync_box_scores(
        skip_existing=skip,
        exclude_preseason=not include_preseason,
        season=temporada,
    )