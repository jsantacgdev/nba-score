"""
Carga los movimientos de jugadores: traspasos, fichajes y cortes.

Una sola llamada trae el historico completo desde julio de 2015, asi que
el job es idempotente y se puede relanzar cuantas veces haga falta.
"""

from collections import Counter

from src.clients.nba_movement import get_player_movement
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 500


def sync_transactions() -> None:
    print("Sincronizando movimientos de jugadores...")

    movimientos = get_player_movement()
    if not movimientos:
        print("No se obtuvieron movimientos.")
        return

    fechas = sorted(m["transaction_date"] for m in movimientos)
    tipos = Counter(m["transaction_type"] for m in movimientos)
    print(f"   {len(movimientos)} movimientos, de {fechas[0]} a {fechas[-1]}")
    for tipo, cuantos in tipos.most_common():
        print(f"      {tipo}: {cuantos}")

    client = get_supabase_client()

    # Los equipos si tienen clave foranea implicita en la app, asi que se
    # descartan los que no reconocemos (franquicias antiguas o ligas de
    # desarrollo que aparecen sueltas en el feed).
    equipos = {t["id"] for t in client.table("teams").select("id").execute().data}
    limpios = []
    sin_equipo = 0
    for m in movimientos:
        if m["team_id"] and m["team_id"] not in equipos:
            sin_equipo += 1
            m = {**m, "team_id": None}
        limpios.append(m)
    if sin_equipo:
        print(f"   {sin_equipo} con un equipo desconocido, se guardan sin equipo")

    total = 0
    for i in range(0, len(limpios), BATCH_SIZE):
        result = client.table("player_transactions").upsert(limpios[i : i + BATCH_SIZE]).execute()
        total += len(result.data)

    print(f"\n✅ {total} movimientos guardados")

    # Cuantos enlazan con jugadores que tenemos
    conocidos: set[str] = set()
    offset = 0
    while True:
        r = client.table("players").select("id").order("id").range(offset, offset + 999).execute()
        if not r.data:
            break
        conocidos.update(x["id"] for x in r.data)
        if len(r.data) < 1000:
            break
        offset += 1000

    con_ficha = {m["player_id"] for m in limpios if m["player_id"] and m["player_id"] in conocidos}
    todos = {m["player_id"] for m in limpios if m["player_id"]}
    print(f"   {len(con_ficha)} de {len(todos)} jugadores del feed tienen ficha en la app")


if __name__ == "__main__":
    sync_transactions()
