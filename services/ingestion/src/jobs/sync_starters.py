
import sys
import time

from src.clients.starters import get_game_starters
from src.clients.supabase import get_supabase_client

REQUEST_DELAY = 0.6
BATCH_SIZE = 500
PAGE_SIZE = 1000

def _paginar(client, tabla: str, campos: str, orden: str, filtros=None):
    filas, offset = [], 0
    while True:
        consulta = client.table(tabla).select(campos)
        for campo, valor in (filtros or {}).items():
            consulta = consulta.eq(campo, valor)
        pagina = consulta.order(orden).range(offset, offset + PAGE_SIZE - 1).execute()
        if not pagina.data:
            break
        filas.extend(pagina.data)
        if len(pagina.data) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return filas

def sync_starters(season: str | None = None, rehacer: bool = False) -> None:
    client = get_supabase_client()

    filtros = {"status": "final"}
    if season:
        filtros["season"] = season
    juegos = _paginar(client, "games", "id, season", "id", filtros)

    juegos = [j for j in juegos if not j["id"].startswith("bdl_")]

    if not rehacer:
        ya = {f["game_id"] for f in _paginar(client, "game_starters", "game_id", "game_id")}
        juegos = [j for j in juegos if j["id"] not in ya]

    ambito = f"de {season}" if season else "de todas las temporadas"
    print(f"Cargando quintetos iniciales {ambito}...")
    print(f"   {len(juegos)} partidos por procesar")
    if not juegos:
        print("Nada que hacer.")
        return

    conocidos = {p["id"] for p in _paginar(client, "players", "id", "id")}

    pendientes: list[dict] = []
    total = sin_datos = descartados = 0

    for i, juego in enumerate(juegos, start=1):
        try:
            filas = get_game_starters(juego["id"])
        except Exception as e:
            print(f"   [{i}/{len(juegos)}] {juego['id']}: Error: {type(e).__name__}")
            time.sleep(REQUEST_DELAY)
            continue

        if not filas:
            sin_datos += 1
        else:
            validas = [f for f in filas if f["player_id"] in conocidos]
            descartados += len(filas) - len(validas)
            pendientes.extend(validas)

        if len(pendientes) >= BATCH_SIZE:
            client.table("game_starters").upsert(pendientes).execute()
            total += len(pendientes)
            pendientes = []

        if i % 50 == 0:
            print(f"   [{i}/{len(juegos)}] {total} filas guardadas")

        time.sleep(REQUEST_DELAY)

    if pendientes:
        client.table("game_starters").upsert(pendientes).execute()
        total += len(pendientes)

    print(f"\n✅ Completado.")
    print(f"   Filas guardadas: {total}  ({total // 10} partidos completos)")
    if sin_datos:
        print(f"   Sin box score: {sin_datos}")
    if descartados:
        print(f"   Jugadores no dados de alta: {descartados}")

if __name__ == "__main__":
    temporada = None
    if "--season" in sys.argv:
        temporada = sys.argv[sys.argv.index("--season") + 1]
    sync_starters(season=temporada, rehacer="--all" in sys.argv)
