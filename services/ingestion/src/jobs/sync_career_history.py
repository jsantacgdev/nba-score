"""
Rellena player_season_history desde PlayerCareerStats.

sync_history saca las medias de LeagueDashPlayerStats, que es una sola
llamada por temporada y va perfecto... hasta 1996-97. Para temporadas
anteriores ese endpoint devuelve cero jugadores, asi que las plantillas de
los 80 y primeros 90 se cargaron sin ninguna estadistica.

PlayerCareerStats si llega hasta 1984 y devuelve la carrera entera de un
jugador en una sola llamada, asi que aqui se recorre por jugador en vez de
por temporada.

Rellena los huecos: cualquier (jugador, temporada) que tenga ficha de
plantilla pero no medias. Es reanudable y no toca lo ya cargado.
"""

import time

from src.clients.nba import REQUEST_DELAY, get_player_career_splits
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 500

STAT_FIELDS = (
    "minutes",
    "points",
    "rebounds",
    "assists",
    "steals",
    "blocks",
    "turnovers",
    "field_goal_pct",
    "three_point_pct",
    "free_throw_pct",
)


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


def _weighted(rows: list[dict], field: str, total_games: int) -> float:
    """
    Media de temporada a partir de las etapas en cada equipo.

    Es lo mismo que la fila 'TOT' que publica la NBA: cada etapa pesa por
    los partidos jugados en ella.
    """
    if not total_games:
        return 0.0
    acumulado = sum((r[field] or 0) * (r["games_played"] or 0) for r in rows)
    decimales = 3 if field.endswith("_pct") else 1
    return round(acumulado / total_games, decimales)


def sync_career_history(force: bool = False) -> None:
    client = get_supabase_client()

    teams = client.table("teams").select("id").execute()
    valid_team_ids = {row["id"] for row in teams.data}

    print("Cargando estado actual...")
    roster_rows = _fetch_all(client, "player_season_teams", "player_id,season,team_id")
    history = {
        (r["player_id"], r["season"])
        for r in _fetch_all(client, "player_season_history", "player_id,season")
    }
    champions = {
        r["season"]: r["team_id"]
        for r in _fetch_all(client, "season_champions", "season,team_id")
    }

    # Quien estaba en la plantilla del campeon de cada temporada
    champion_squads: set[tuple[str, str]] = set()
    rosters_by_player: dict[str, set[str]] = {}
    for row in roster_rows:
        rosters_by_player.setdefault(row["player_id"], set()).add(row["season"])
        if champions.get(row["season"]) == row["team_id"]:
            champion_squads.add((row["player_id"], row["season"]))

    # Huecos: ficha de plantilla sin medias
    gaps: dict[str, set[str]] = {}
    for row in roster_rows:
        key = (row["player_id"], row["season"])
        if force or key not in history:
            gaps.setdefault(row["player_id"], set()).add(row["season"])

    pending = sorted(gaps)
    total_pares = sum(len(v) for v in gaps.values())
    print(f"{total_pares} temporadas sin medias en {len(pending)} jugadores\n")

    if not pending:
        print("Nada que rellenar.")
        return

    creadas = 0
    errores = 0
    sin_datos = 0

    for i, player_id in enumerate(pending, start=1):
        try:
            splits = get_player_career_splits(player_id)
        except Exception as e:
            errores += 1
            print(f"   [{i}/{len(pending)}] {player_id}: error ({e})")
            time.sleep(REQUEST_DELAY)
            continue

        if not splits:
            sin_datos += 1
            print(f"   [{i}/{len(pending)}] {player_id}: sin ficha de carrera")
            time.sleep(REQUEST_DELAY)
            continue

        # Agrupamos las etapas por temporada
        por_temporada: dict[str, list[dict]] = {}
        for s in splits:
            if s["team_id"] in valid_team_ids:
                por_temporada.setdefault(s["season"], []).append(s)

        filas_historia = []
        filas_equipos = []
        for season in gaps[player_id]:
            etapas = por_temporada.get(season)
            if not etapas:
                continue

            partidos = sum(e["games_played"] or 0 for e in etapas)
            principal = max(etapas, key=lambda e: e["games_played"] or 0)

            fila = {
                "player_id": player_id,
                "season": season,
                "primary_team_id": principal["team_id"],
                "team_count": len(etapas),
                "games_played": partidos,
                "won_championship": (player_id, season) in champion_squads,
            }
            for field in STAT_FIELDS:
                fila[field] = _weighted(etapas, field, partidos)
            filas_historia.append(fila)

            # De paso, el desglose por equipo de esa temporada
            filas_equipos.extend(etapas)

        if filas_historia:
            _upsert_in_batches(client, "player_season_history", filas_historia)
            _upsert_in_batches(client, "player_season_teams", filas_equipos)
            creadas += len(filas_historia)
            anillos = sum(1 for f in filas_historia if f["won_championship"])
            marca = f" ({anillos} con anillo)" if anillos else ""
            print(f"   [{i}/{len(pending)}] {player_id}: "
                  f"{len(filas_historia)} temporadas{marca}")
        else:
            print(f"   [{i}/{len(pending)}] {player_id}: sin datos utiles")

        if i < len(pending):
            time.sleep(REQUEST_DELAY)

    print("\nCompletado.")
    print(f"   Temporadas con medias nuevas: {creadas}")
    if sin_datos:
        print(f"   Jugadores sin ficha de carrera en la API: {sin_datos}")
    if errores:
        print(f"   Errores: {errores} (puedes reejecutar para reintentar)")


if __name__ == "__main__":
    import sys

    sync_career_history(force="--force" in sys.argv)
