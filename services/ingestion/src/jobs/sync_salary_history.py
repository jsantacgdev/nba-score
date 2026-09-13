"""
Carga el historico de sueldos desde las fichas de Basketball-Reference.

Es una peticion por jugador, asi que con el retardo de tres segundos son
unos 32 minutos para los 630 activos y cerca de tres horas para los 3.600
de la base. Por eso se prioriza: primero los activos, luego el resto de mas
reciente a mas antiguo, y con --limite se puede hacer por tandas.

Las paginas quedan en cache, asi que relanzarlo no repite descargas.

El enlace entre sus fichas y las nuestras se hace una sola vez: el indice
por letra da su identificador, se guarda en players.bbref_id y a partir de
ahi ya no hay que adivinar nada.
"""

import re
import sys
import unicodedata
from collections import Counter
from string import ascii_lowercase

from src.clients.bbref import (
    descargar_indice,
    descargar_jugador,
    parsear_indice,
    parsear_salarios,
)
from src.clients.supabase import get_supabase_client
from src.jobs.sync_draft_pick_details import CACHE

BATCH_SIZE = 200


def normalizar(nombre: str) -> str:
    limpio = unicodedata.normalize("NFKD", nombre or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z ]", "", limpio.lower()).strip()


def _cargar_jugadores(client) -> list[dict]:
    jugadores, offset = [], 0
    while True:
        pagina = (
            client.table("players")
            .select("id, first_name, last_name, is_active, bbref_id")
            .order("id")
            .range(offset, offset + 999)
            .execute()
        )
        if not pagina.data:
            break
        jugadores.extend(pagina.data)
        if len(pagina.data) < 1000:
            break
        offset += 1000
    return jugadores


def enlazar_identificadores(client, jugadores: list[dict]) -> dict[str, str]:
    """
    Empareja nuestros jugadores con su ficha, por nombre normalizado.

    Solo hacen falta 26 paginas, una por letra. Cuando un nombre se repite
    se descarta: prefiero dejarlo sin enlazar a colgarle a alguien el sueldo
    de otro.
    """
    por_nombre: dict[str, list[dict]] = {}
    for letra in ascii_lowercase:
        pagina = descargar_indice(letra, CACHE)
        if not pagina:
            continue
        for ficha in parsear_indice(pagina):
            por_nombre.setdefault(normalizar(ficha["name"]), []).append(ficha)

    print(f"   indice: {sum(len(v) for v in por_nombre.values())} fichas")

    enlaces: dict[str, str] = {}
    ambiguos = 0
    for j in jugadores:
        if j.get("bbref_id"):
            enlaces[j["id"]] = j["bbref_id"]
            continue
        candidatos = por_nombre.get(normalizar(f"{j['first_name']} {j['last_name']}"), [])
        if len(candidatos) == 1:
            enlaces[j["id"]] = candidatos[0]["bbref_id"]
        elif len(candidatos) > 1:
            ambiguos += 1

    print(f"   enlazados: {len(enlaces)} de {len(jugadores)} ({ambiguos} con nombre repetido)")

    nuevos = [
        {"id": pid, "bbref_id": bid}
        for pid, bid in enlaces.items()
        if not next((j for j in jugadores if j["id"] == pid), {}).get("bbref_id")
    ]
    for i in range(0, len(nuevos), BATCH_SIZE):
        for fila in nuevos[i : i + BATCH_SIZE]:
            client.table("players").update({"bbref_id": fila["bbref_id"]}).eq(
                "id", fila["id"]
            ).execute()

    return enlaces


def sync_salary_history(limite: int | None = None, solo_activos: bool = False) -> None:
    print("Cargando historico de sueldos...")
    client = get_supabase_client()

    equipos = {
        t["full_name"]: t["id"]
        for t in client.table("teams").select("id, full_name").execute().data
    }

    jugadores = _cargar_jugadores(client)
    enlaces = enlazar_identificadores(client, jugadores)

    # Los que ya tienen historico no se vuelven a pedir
    ya_cargados = set()
    offset = 0
    while True:
        pagina = (
            client.table("player_salary_history")
            .select("player_id")
            .order("player_id")
            .range(offset, offset + 999)
            .execute()
        )
        if not pagina.data:
            break
        ya_cargados.update(x["player_id"] for x in pagina.data)
        if len(pagina.data) < 1000:
            break
        offset += 1000

    # Activos primero: son los que mas se consultan
    pendientes = [
        j for j in jugadores if j["id"] in enlaces and j["id"] not in ya_cargados
    ]
    if solo_activos:
        pendientes = [j for j in pendientes if j.get("is_active")]
    pendientes.sort(key=lambda j: (not j.get("is_active"), j["last_name"]))
    if limite:
        pendientes = pendientes[:limite]

    print(f"   {len(ya_cargados)} jugadores ya tienen historico")
    print(f"   {len(pendientes)} por descargar\n")

    filas = []
    sin_equipo: Counter = Counter()
    vacios = 0

    for i, j in enumerate(pendientes, 1):
        pagina = descargar_jugador(enlaces[j["id"]], CACHE)
        if not pagina:
            vacios += 1
            continue

        salarios = parsear_salarios(pagina)
        if not salarios:
            vacios += 1
        for s in salarios:
            team_id = equipos.get(s["team_name"])
            if not team_id:
                sin_equipo[s["team_name"]] += 1
            filas.append(
                {
                    "player_id": j["id"],
                    "season": s["season"],
                    "team_name": s["team_name"],
                    "salary": s["salary"],
                    "team_id": team_id,
                }
            )

        if i % 25 == 0 or i == len(pendientes):
            print(f"      [{i}/{len(pendientes)}] {j['first_name']} {j['last_name']}")

    if vacios:
        print(f"\n   {vacios} fichas sin tabla de sueldos")
    if sin_equipo:
        print(f"   {len(sin_equipo)} franquicias desaparecidas: {list(sin_equipo)[:5]}")

    # Una fila por (jugador, temporada, equipo): un traspasado a media
    # temporada cobra de los dos
    vistos = set()
    limpias = []
    for f in filas:
        clave = (f["player_id"], f["season"], f["team_name"])
        if clave in vistos:
            continue
        vistos.add(clave)
        limpias.append(f)

    total = 0
    for i in range(0, len(limpias), BATCH_SIZE):
        resultado = (
            client.table("player_salary_history").upsert(limpias[i : i + BATCH_SIZE]).execute()
        )
        total += len(resultado.data)

    print(f"\n✅ {total} temporadas de sueldo guardadas")


if __name__ == "__main__":
    tope = None
    if "--limite" in sys.argv:
        tope = int(sys.argv[sys.argv.index("--limite") + 1])
    sync_salary_history(tope, "--activos" in sys.argv)
