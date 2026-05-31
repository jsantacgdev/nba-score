from src.clients.nba import get_all_rosters
from src.clients.supabase import get_supabase_client


def sync_players() -> None:
    print("Iniciando sincronización de jugadores...")

    client = get_supabase_client()

    # Obtenemos los IDs de equipos desde Supabase (ya cargados antes)
    teams_result = client.table("teams").select("id").execute()
    team_ids = [row["id"] for row in teams_result.data]

    if not team_ids:
        print("No hay equipos en la base de datos. Ejecuta primero sync_teams.")
        return

    print(f"   {len(team_ids)} equipos encontrados. Obteniendo plantillas...")

    players = get_all_rosters(team_ids)
    print(f"\n   Total: {len(players)} jugadores obtenidos")

    if not players:
        print("No se obtuvo ningún jugador.")
        return

    # Upsert por lotes (Supabase maneja bien hasta ~500 por lote)
    result = client.table("players").upsert(players).execute()

    print(f"✅ Sincronizados {len(result.data)} jugadores en Supabase")


if __name__ == "__main__":
    sync_players()