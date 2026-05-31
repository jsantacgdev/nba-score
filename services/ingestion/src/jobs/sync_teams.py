from src.clients.nba import get_all_teams
from src.clients.supabase import get_supabase_client


def sync_teams() -> None:
    print("Iniciando sincronización de equipos...")

    teams = get_all_teams()
    print(f"   Obtenidos {len(teams)} equipos de nba_api")

    client = get_supabase_client()
    result = client.table("teams").upsert(teams).execute()

    print(f"✅ Sincronizados {len(result.data)} equipos en Supabase")


if __name__ == "__main__":
    sync_teams()