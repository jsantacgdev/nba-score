
from src.clients.nba import _id, _whole
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 500

def get_draft_history() -> list[dict]:
    from nba_api.stats.endpoints import drafthistory

    df = drafthistory.DraftHistory(timeout=60).get_data_frames()[0]

    filas = []
    vistos: set[tuple[str, int]] = set()
    for _, row in df.iterrows():
        player_id = _id(row["PERSON_ID"])
        try:
            year = int(str(row["SEASON"]).strip())
        except (TypeError, ValueError):
            continue

        if (player_id, year) in vistos:
            continue
        vistos.add((player_id, year))

        team_id = _id(row["TEAM_ID"])
        organizacion = str(row["ORGANIZATION"]).strip()

        filas.append(
            {
                "player_id": player_id,
                "draft_year": year,
                "player_name": str(row["PLAYER_NAME"]).strip(),
                "round": _whole(row, "ROUND_NUMBER"),
                "round_pick": _whole(row, "ROUND_PICK"),
                "overall_pick": _whole(row, "OVERALL_PICK"),
                "team_id": team_id if team_id and team_id != "0" else None,
                "team_abbreviation": str(row["TEAM_ABBREVIATION"]).strip() or None,
                "organization": organizacion if organizacion and organizacion != "nan" else None,
            }
        )

    return filas

def sync_draft() -> None:
    print("Sincronizando historico del draft...")

    filas = get_draft_history()
    if not filas:
        print("No se obtuvieron selecciones.")
        return

    años = sorted({f["draft_year"] for f in filas})
    print(f"   {len(filas)} selecciones, de {años[0]} a {años[-1]}")

    client = get_supabase_client()

    total = 0
    for i in range(0, len(filas), BATCH_SIZE):
        result = client.table("draft_picks").upsert(filas[i : i + BATCH_SIZE]).execute()
        total += len(result.data)

    print(f"\n✅ {total} selecciones guardadas")

    conocidos: set[str] = set()
    offset = 0
    while True:
        r = client.table("players").select("id").range(offset, offset + 999).execute()
        if not r.data:
            break
        conocidos.update(x["id"] for x in r.data)
        if len(r.data) < 1000:
            break
        offset += 1000

    drafteados = {f["player_id"] for f in filas}
    print(f"   {len(conocidos & drafteados)} de nuestros {len(conocidos)} jugadores tienen draft")
    print(f"   {len(conocidos - drafteados)} llegaron sin ser elegidos")

if __name__ == "__main__":
    sync_draft()
