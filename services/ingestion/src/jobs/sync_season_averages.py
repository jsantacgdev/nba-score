from src.clients.nba import CURRENT_SEASON
from src.clients.supabase import get_supabase_client


def sync_season_averages(season: str = CURRENT_SEASON) -> None:
    print(f"Recalculando medias de {season} desde las lineas de box score...")

    client = get_supabase_client()
    result = client.rpc("refresh_season_averages", {"target_season": season}).execute()

    cambiados = result.data or 0
    if cambiados:
        print(f"{cambiados} jugadores con medias nuevas en {season}")
    else:
        print(f"Las medias de {season} ya estaban al dia")


if __name__ == "__main__":
    import sys

    argumentos = [a for a in sys.argv[1:] if not a.startswith("-")]
    sync_season_averages(argumentos[0] if argumentos else CURRENT_SEASON)
