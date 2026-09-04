from src.clients.nba import CURRENT_SEASON, get_season_stats
from src.clients.supabase import get_supabase_client


def sync_season_stats() -> None:
    print("Iniciando sincronización de stats de temporada...")

    stats = get_season_stats(CURRENT_SEASON)
    print(f"   Obtenidas stats de {len(stats)} jugadores")

    if not stats:
        print(f"Sin stats para la temporada {CURRENT_SEASON} (¿aún no ha empezado?).")
        return

    client = get_supabase_client()

    # Filtramos solo jugadores que existen en nuestra tabla players
    # para evitar errores de foreign key
    existing = client.table("players").select("id").execute()
    existing_ids = {row["id"] for row in existing.data}
    filtered = [s for s in stats if s["player_id"] in existing_ids]

    print(f"   {len(filtered)} coinciden con jugadores en la base de datos")

    if not filtered:
        print("Ningún jugador coincide. Ejecuta primero sync_players.")
        return

    result = client.table("player_season_stats").upsert(filtered).execute()
    print(f"✅ Sincronizadas {len(result.data)} stats de temporada")


if __name__ == "__main__":
    sync_season_stats()
