"""
Rellena las estadisticas por equipo dentro de cada temporada.

sync_history deja player_season_teams con la pertenencia a plantilla, pero
sin numeros: las medias que publica la NBA son de temporada completa y a un
traspasado le mezclan las dos etapas.

Este job lo arregla en dos fases:

  A. Jugadores traspasados (team_count > 1). Una llamada a PlayerCareerStats
     por jugador devuelve su carrera entera desglosada por equipo, asi que
     ademas de rellenar los numeros CREA las filas que faltaban: la etapa en
     el equipo que dejo a mitad de temporada no sale en ninguna plantilla de
     final de año.

  B. El resto. Si solo jugo en un equipo, las medias de temporada SON las
     de ese equipo, asi que se copian de player_season_history sin gastar
     una sola llamada.

Es reanudable: salta lo que ya tiene numeros.
"""

import time

from src.clients.nba import REQUEST_DELAY, get_player_career_splits
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 500

STAT_FIELDS = (
    "games_played",
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
    """Lee una tabla entera paginando, porque Supabase corta en 1000 filas."""
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


def sync_player_splits(force: bool = False) -> None:
    client = get_supabase_client()

    teams = client.table("teams").select("id").execute()
    valid_team_ids = {row["id"] for row in teams.data}

    known_players = {row["id"] for row in _fetch_all(client, "players", "id")}

    history = _fetch_all(
        client,
        "player_season_history",
        "player_id,season,primary_team_id,team_count," + ",".join(STAT_FIELDS),
    )
    existing = _fetch_all(
        client, "player_season_teams", "player_id,season,team_id,games_played"
    )

    print(f"{len(history)} filas de historico, {len(existing)} fichas de plantilla")

    # Cuantas filas con numeros hay ya por (jugador, temporada)
    filled: dict[tuple[str, str], int] = {}
    present: set[tuple[str, str, str]] = set()
    for row in existing:
        key = (row["player_id"], row["season"])
        present.add((row["player_id"], row["season"], row["team_id"]))
        if row["games_played"] is not None:
            filled[key] = filled.get(key, 0) + 1

    # ------------------------------------------------------------------
    # Fase A: traspasados
    # ------------------------------------------------------------------
    traded: dict[str, set[str]] = {}
    for row in history:
        if (row["team_count"] or 1) > 1:
            traded.setdefault(row["player_id"], set()).add(row["season"])

    counts = {
        (row["player_id"], row["season"]): (row["team_count"] or 1) for row in history
    }

    pending = sorted(
        player_id
        for player_id, seasons in traded.items()
        if force
        or any(filled.get((player_id, s), 0) < counts[(player_id, s)] for s in seasons)
    )

    print(
        f"\n=== Fase A: {len(traded)} jugadores traspasados, "
        f"{len(pending)} por procesar ==="
    )

    nuevas_filas = 0
    errores = 0

    for i, player_id in enumerate(pending, start=1):
        seasons = traded[player_id]
        try:
            splits = get_player_career_splits(player_id)
        except Exception as e:
            errores += 1
            print(f"   [{i}/{len(pending)}] {player_id}: error ({e})")
            time.sleep(REQUEST_DELAY)
            continue

        # Solo las temporadas en las que sabemos que hubo traspaso
        relevantes = [
            s
            for s in splits
            if s["season"] in seasons and s["team_id"] in valid_team_ids
        ]

        if relevantes:
            creadas = sum(
                1
                for s in relevantes
                if (s["player_id"], s["season"], s["team_id"]) not in present
            )
            nuevas_filas += creadas
            _upsert_in_batches(client, "player_season_teams", relevantes)
            for s in relevantes:
                present.add((s["player_id"], s["season"], s["team_id"]))

            marca = f" (+{creadas} etapas recuperadas)" if creadas else ""
            print(
                f"   [{i}/{len(pending)}] {player_id}: "
                f"{len(relevantes)} etapas{marca}"
            )
        else:
            print(f"   [{i}/{len(pending)}] {player_id}: sin desglose util")

        if i < len(pending):
            time.sleep(REQUEST_DELAY)

    # ------------------------------------------------------------------
    # Fase B: el resto, sin llamadas a la API
    # ------------------------------------------------------------------
    print("\n=== Fase B: jugadores de un solo equipo (sin llamadas) ===")

    directas = []
    for row in history:
        if (row["team_count"] or 1) > 1:
            continue

        team_id = row["primary_team_id"]
        key = (row["player_id"], row["season"])
        if team_id not in valid_team_ids or row["player_id"] not in known_players:
            continue
        if not force and filled.get(key, 0) >= 1:
            continue

        fila = {
            "player_id": row["player_id"],
            "season": row["season"],
            "team_id": team_id,
        }
        for field in STAT_FIELDS:
            fila[field] = row[field]
        directas.append(fila)

    if directas:
        creadas = sum(
            1
            for f in directas
            if (f["player_id"], f["season"], f["team_id"]) not in present
        )
        total = _upsert_in_batches(client, "player_season_teams", directas)
        print(f"   {total} filas rellenadas ({creadas} creadas de cero)")
    else:
        print("   Nada que rellenar")

    print("\nCompletado.")
    print(f"   Etapas recuperadas en fase A: {nuevas_filas}")
    if errores:
        print(f"   Errores: {errores} (puedes reejecutar para reintentar)")


if __name__ == "__main__":
    import sys

    sync_player_splits(force="--force" in sys.argv)
