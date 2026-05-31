import time

from src.clients.nba import REQUEST_DELAY
from src.clients.supabase import get_supabase_client
from src.jobs.sync_game_log import sync_player_log


def sync_all_game_logs(skip_existing: bool = True) -> None:
    """Sincroniza el game log de TODOS los jugadores de la liga."""
    print("Sincronizando game logs de toda la liga...")
    print("Esto puede tardar 15-25 minutos. Puedes dejarlo corriendo.\n")

    client = get_supabase_client()

    players = (
        client.table("players")
        .select("id, first_name, last_name")
        .eq("is_active", True)
        .order("id")
        .execute()
    )

    if not players.data:
        print("No hay jugadores en la base de datos.")
        return

    # Si skip_existing, saltamos jugadores que ya tienen partidos cargados
    already_loaded: set[str] = set()
    if skip_existing:
        existing = client.table("player_game_log").select("player_id").execute()
        already_loaded = {row["player_id"] for row in existing.data}
        if already_loaded:
            print(f"{len(already_loaded)} jugadores ya tienen datos, se omiten.\n")

    total = len(players.data)
    total_games = 0
    processed = 0
    errors = 0

    for i, player in enumerate(players.data, start=1):
        name = f"{player['first_name']} {player['last_name']}"

        if skip_existing and player["id"] in already_loaded:
            print(f"   [{i}/{total}] {name} — omitido (ya cargado)")
            continue

        print(f"   [{i}/{total}] {name}...")
        try:
            count = sync_player_log(client, player["id"])
            total_games += count
            processed += 1
            print(f"        → {count} partidos")
        except Exception as e:
            errors += 1
            print(f"        Error: {e}")

        time.sleep(REQUEST_DELAY)

    print(f"\n✅ Completado.")
    print(f"   Jugadores procesados: {processed}")
    print(f"   Partidos sincronizados: {total_games}")
    if errors:
        print(f"   Errores: {errors} (puedes reejecutar para reintentar)")


if __name__ == "__main__":
    import sys

    # Por defecto omite jugadores ya cargados. Pasa "--all" para forzar todos.
    skip = "--all" not in sys.argv
    sync_all_game_logs(skip_existing=skip)