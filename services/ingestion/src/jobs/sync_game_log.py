import time

from src.clients.nba import REQUEST_DELAY, get_player_game_log
from src.clients.supabase import get_supabase_client


def sync_player_log(client, player_id: str) -> int:
    """Sincroniza el game log de un jugador. Devuelve nº de partidos."""
    log = get_player_game_log(player_id)
    if log:
        client.table("player_game_log").upsert(log).execute()
    return len(log)


def sync_game_log_for_team(team_id: str) -> None:
    """Sincroniza el game log de todos los jugadores de un equipo."""
    print(f"Sincronizando game log del equipo {team_id}...")

    client = get_supabase_client()
    players = (
        client.table("players")
        .select("id, first_name, last_name")
        .eq("team_id", team_id)
        .execute()
    )

    if not players.data:
        print("No hay jugadores para ese equipo.")
        return

    total_games = 0
    for i, player in enumerate(players.data, start=1):
        name = f"{player['first_name']} {player['last_name']}"
        print(f"   [{i}/{len(players.data)}] {name}...")
        try:
            count = sync_player_log(client, player["id"])
            total_games += count
            print(f"        → {count} partidos")
        except Exception as e:
            print(f"        Error: {e}")

        if i < len(players.data):
            time.sleep(REQUEST_DELAY)

    print(f"✅ {total_games} partidos sincronizados en total")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python -m src.jobs.sync_game_log <team_id>")
        print("Ejemplo (Lakers): python -m src.jobs.sync_game_log 1610612747")
        sys.exit(1)

    sync_game_log_for_team(sys.argv[1])