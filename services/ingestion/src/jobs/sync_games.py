from src.clients.nba import CURRENT_SEASON, get_league_games
from src.clients.supabase import get_supabase_client


def sync_games() -> None:
    print("Sincronizando partidos de la temporada...")

    games = get_league_games(CURRENT_SEASON)
    print(f"   {len(games)} partidos obtenidos")

    if not games:
        print("No se obtuvieron partidos.")
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

    # Upsert por lotes de 500 para no exceder límites
    batch_size = 500
    total = 0
    for i in range(0, len(filtered), batch_size):
        batch = filtered[i : i + batch_size]
        result = client.table("games").upsert(batch).execute()
        total += len(result.data)

    print(f"✅ {total} partidos sincronizados")


if __name__ == "__main__":
    sync_games()