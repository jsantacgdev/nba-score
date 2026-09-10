
import time

from src.clients.nba import (
    CURRENT_SEASON,
    REQUEST_DELAY,
    build_player_photo_url,
    get_season_champion,
    get_season_history_stats,
    get_team_name,
    get_team_roster,
    season_range,
)
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 500

def _fetch_all(client, table: str, columns: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0

    while True:
        result = client.table(table).select(columns).range(offset, offset + 999).execute()
        if not result.data:
            break
        rows.extend(result.data)
        if len(result.data) < 1000:
            break
        offset += 1000

    return rows

def _upsert_in_batches(client, table: str, rows: list[dict]) -> int:
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        result = client.table(table).upsert(rows[i : i + BATCH_SIZE]).execute()
        total += len(result.data)
    return total

def _split_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split(" ", 1)
    return parts[0], (parts[1] if len(parts) > 1 else "")

def sync_history(
    seasons: list[str],
    skip_rosters: bool = False,
    force: bool = False,
) -> None:
    client = get_supabase_client()

    teams = client.table("teams").select("id").execute()
    valid_team_ids = {row["id"] for row in teams.data}
    team_ids = sorted(valid_team_ids)

    known_players = {row["id"] for row in _fetch_all(client, "players", "id")}
    print(f"{len(known_players)} jugadores ya en la base de datos")

    done_seasons: set[str] = set()
    done_team_seasons: set[tuple[str, str]] = set()
    if not force:
        done_seasons = {
            row["season"] for row in _fetch_all(client, "player_season_history", "season")
        }
        done_team_seasons = {
            (row["season"], row["team_id"])
            for row in _fetch_all(client, "player_season_teams", "season, team_id")
        }
        if done_seasons:
            print(f"{len(done_seasons)} temporadas ya cargadas, se omiten sus medias")

    print(f"Temporadas a procesar: {seasons[0]} -> {seasons[-1]} ({len(seasons)})\n")

    for n, season in enumerate(seasons, start=1):
        print(f"===== [{n}/{len(seasons)}] Temporada {season} =====")

        champion_team_id = None
        try:
            champion = get_season_champion(season)
        except Exception as e:
            champion = None
            print(f"   No se pudo obtener el campeon: {e}")

        if champion and champion["team_id"] in valid_team_ids:
            champion_team_id = champion["team_id"]
            client.table("season_champions").upsert(champion).execute()
            print(
                f"   Campeon: {get_team_name(champion_team_id)} "
                f"({champion['decided_at']})"
            )
        else:
            print("   Sin campeon todavia (temporada en curso o sin playoffs)")
        time.sleep(REQUEST_DELAY)

        roster_rows: list[dict] = []
        roster_players: dict[str, dict] = {}
        champion_squad: set[str] = set()

        if not skip_rosters:
            pending = [t for t in team_ids if (season, t) not in done_team_seasons]
            if not pending:
                print("   Plantillas ya cargadas, se omiten")
            else:
                print(f"   Plantillas: {len(pending)} equipos por consultar")

            for i, team_id in enumerate(pending, start=1):
                team_name = get_team_name(team_id)
                try:
                    squad = get_team_roster(team_id, season)
                except Exception as e:
                    print(f"      [{i}/{len(pending)}] {team_name}: error ({e})")
                    time.sleep(REQUEST_DELAY)
                    continue

                for player in squad:
                    roster_players[player["id"]] = player
                    roster_rows.append(
                        {
                            "player_id": player["id"],
                            "season": season,
                            "team_id": team_id,
                            "jersey_number": player["jersey_number"],
                            "position": player["position"],
                        }
                    )
                    if team_id == champion_team_id:
                        champion_squad.add(player["id"])

                print(f"      [{i}/{len(pending)}] {team_name}: {len(squad)} jugadores")
                if i < len(pending):
                    time.sleep(REQUEST_DELAY)

        if season in done_seasons and not force:
            print("   Medias ya cargadas, se omiten")
            stats = []
        else:
            try:
                stats = get_season_history_stats(season)
                print(f"   Medias obtenidas de {len(stats)} jugadores")
            except Exception as e:
                stats = []
                print(f"   Error obteniendo medias: {e}")
            time.sleep(REQUEST_DELAY)

        nuevos: dict[str, dict] = {}
        for row in stats:
            player_id = row["player_id"]
            if player_id in known_players or player_id in nuevos:
                continue
            first, last = _split_name(row["player_name"])
            team_id = row["primary_team_id"]
            nuevos[player_id] = {
                "id": player_id,
                "team_id": team_id if team_id in valid_team_ids else None,
                "first_name": first,
                "last_name": last,
                "photo_url": build_player_photo_url(player_id),
                "is_active": False,
            }

        for player_id, player in roster_players.items():
            if player_id in known_players or player_id in nuevos:
                continue
            team_id = player["team_id"]
            nuevos[player_id] = {
                "id": player_id,
                "team_id": team_id if team_id in valid_team_ids else None,
                "first_name": player["first_name"],
                "last_name": player["last_name"],
                "position": player["position"],
                "jersey_number": player["jersey_number"],
                "photo_url": player["photo_url"],
                "is_active": False,
            }

        if nuevos:
            inserted = _upsert_in_batches(client, "players", list(nuevos.values()))
            known_players.update(nuevos.keys())
            print(f"   {inserted} jugadores historicos dados de alta")

        if roster_rows:
            validas = [r for r in roster_rows if r["player_id"] in known_players]
            descartadas = len(roster_rows) - len(validas)
            if validas:
                total = _upsert_in_batches(client, "player_season_teams", validas)
                msg = f"   {total} fichas de plantilla guardadas"
                if descartadas:
                    msg += f" ({descartadas} descartadas, jugador desconocido)"
                print(msg)

        if stats:
            historia = []
            for row in stats:
                if row["player_id"] not in known_players:
                    continue
                team_id = row["primary_team_id"]
                if skip_rosters:
                    anillo = (
                        champion_team_id is not None and team_id == champion_team_id
                    )
                else:
                    anillo = row["player_id"] in champion_squad

                fila = {k: v for k, v in row.items() if k != "player_name"}
                fila["primary_team_id"] = team_id if team_id in valid_team_ids else None
                fila["won_championship"] = anillo
                historia.append(fila)

            total = _upsert_in_batches(client, "player_season_history", historia)
            campeones = sum(1 for h in historia if h["won_championship"])
            print(f"   {total} medias guardadas ({campeones} con anillo)")

        print()

    print("Backfill completado.")

if __name__ == "__main__":
    import sys

    def _flag(name: str, default: str) -> str:
        return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

    if "--season" in sys.argv:
        temporadas = [_flag("--season", CURRENT_SEASON)]
    else:
        temporadas = season_range(_flag("--from", "2000-01"), _flag("--to", CURRENT_SEASON))

    sync_history(
        seasons=temporadas,
        skip_rosters="--skip-rosters" in sys.argv,
        force="--force" in sys.argv,
    )
