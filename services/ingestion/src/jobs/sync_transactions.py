
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

    filas_equipos = client.table("teams").select("id, full_name").execute().data
    equipos = {t["id"] for t in filas_equipos}
    por_nombre = {t["full_name"]: t["id"] for t in filas_equipos}

    limpios = []
    sin_equipo = 0
    sin_origen = 0
    for m in movimientos:
        fila = dict(m)

        nombre_origen = fila.pop("from_team_id_nombre", None)
        fila["from_team_id"] = por_nombre.get(nombre_origen) if nombre_origen else None
        if nombre_origen and not fila["from_team_id"]:
            sin_origen += 1

        if fila["team_id"] and fila["team_id"] not in equipos:
            sin_equipo += 1
            fila["team_id"] = None

        limpios.append(fila)

    if sin_equipo:
        print(f"   {sin_equipo} con un equipo desconocido, se guardan sin equipo")
    if sin_origen:
        print(f"   {sin_origen} con un equipo de origen no reconocido")

    traspasos = [m for m in limpios if m["transaction_type"] == "Trade"]
    con_origen = sum(1 for m in traspasos if m["from_team_id"])
    operaciones = len({m["deal_id"] for m in traspasos if m["from_team_id"]})
    print(f"   traspasos con equipo de origen: {con_origen}/{len(traspasos)}")
    print(f"   agrupados en {operaciones} operaciones distintas")

    total = 0
    for i in range(0, len(limpios), BATCH_SIZE):
        result = client.table("player_transactions").upsert(limpios[i : i + BATCH_SIZE]).execute()
        total += len(result.data)

    print(f"\n✅ {total} movimientos guardados")

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
