
import time

from src.clients.nba import REQUEST_DELAY
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 500

AWARDS = {
    "NBA Champion": "champion",
    "NBA Most Valuable Player": "mvp",
    "NBA Finals Most Valuable Player": "finals_mvp",
    "NBA Rookie of the Year": "roy",
    "NBA Defensive Player of the Year": "dpoy",
    "NBA Most Improved Player": "mip",
    "NBA Clutch Player of the Year": "clutch",
    "NBA Sixth Man of the Year": "sixth_man",
}

MIN_MINUTES = 10.0
MIN_GAMES = 20

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

def get_player_awards(player_id: str) -> list[dict]:
    from nba_api.stats.endpoints import playerawards

    df = playerawards.PlayerAwards(player_id=int(player_id), timeout=60).get_data_frames()[0]

    filas = []
    vistos: set[tuple[str, str]] = set()
    for _, row in df.iterrows():
        award = AWARDS.get(str(row["DESCRIPTION"]).strip())
        if not award:
            continue
        season = str(row["SEASON"]).strip()
        if not season or season == "nan":
            continue
        if (season, award) in vistos:
            continue
        vistos.add((season, award))

        team = str(row["TEAM"]).strip()
        filas.append(
            {
                "player_id": str(player_id),
                "season": season,
                "award": award,
                "team_name": team if team and team != "nan" else None,
            }
        )

    return filas

def sync_awards(force: bool = False) -> None:
    client = get_supabase_client()

    print("Cargando jugadores relevantes...")
    history = _fetch_all(
        client, "player_season_history", "player_id,minutes,games_played"
    )
    candidatos = {
        h["player_id"]
        for h in history
        if (h["minutes"] or 0) >= MIN_MINUTES and (h["games_played"] or 0) >= MIN_GAMES
    }

    ya_tienen: set[str] = set()
    if not force:
        ya_tienen = {a["player_id"] for a in _fetch_all(client, "player_awards", "player_id")}

    pending = sorted(candidatos - ya_tienen) if not force else sorted(candidatos)
    print(f"{len(candidatos)} jugadores con minutos de rotacion")
    if ya_tienen:
        print(f"{len(ya_tienen)} ya consultados, se omiten")
    print(f"{len(pending)} por procesar\n")

    if not pending:
        print("Nada que hacer.")
        return

    con_premio = 0
    total_premios = 0
    errores = 0
    resumen: dict[str, int] = {}

    for i, player_id in enumerate(pending, start=1):
        try:
            premios = get_player_awards(player_id)
        except Exception as e:
            errores += 1
            print(f"   [{i}/{len(pending)}] {player_id}: error ({e})")
            time.sleep(REQUEST_DELAY)
            continue

        if premios:
            _upsert_in_batches(client, "player_awards", premios)
            con_premio += 1
            total_premios += len(premios)
            for p in premios:
                resumen[p["award"]] = resumen.get(p["award"], 0) + 1
            detalle = ", ".join(sorted({p["award"] for p in premios}))
            print(f"   [{i}/{len(pending)}] {player_id}: {len(premios)} ({detalle})")

        if i < len(pending):
            time.sleep(REQUEST_DELAY)

    print("\nCompletado.")
    print(f"   Jugadores con palmares: {con_premio}")
    print(f"   Premios guardados: {total_premios}")
    for award, n in sorted(resumen.items(), key=lambda x: -x[1]):
        print(f"      {award}: {n}")
    if errores:
        print(f"   Errores: {errores} (puedes reejecutar para reintentar)")

if __name__ == "__main__":
    import sys

    sync_awards(force="--force" in sys.argv)
