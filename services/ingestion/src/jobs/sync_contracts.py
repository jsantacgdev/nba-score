"""
Carga los contratos vigentes desde Basketball-Reference.

Una pagina por equipo, 30 en total: minuto y medio con el retardo de tres
segundos que pide su robots.txt.

Son contratos VIGENTES, con el salario de cada temporada futura hasta seis
años vista. Lo que un jugador cobro en el pasado esta en su ficha personal
y seria otra descarga, una peticion por jugador.

El cruce con nuestros jugadores va por nombre, pero acotado a la plantilla
de ese equipo, que es un conjunto de veintitantos: mucho mas seguro que
buscar en los 3.600 de la base.
"""

import re
import unicodedata
from collections import Counter

from src.clients.bbref import descargar_contratos, parsear_contratos
from src.clients.supabase import get_supabase_client
from src.jobs.sync_draft_pick_details import CACHE

BATCH_SIZE = 200


SUFIJOS = {"jr", "sr", "ii", "iii", "iv", "v"}


def normalizar(nombre: str) -> str:
    limpio = unicodedata.normalize("NFKD", nombre or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z ]", "", limpio.lower()).strip()


def sin_sufijo(nombre: str) -> str:
    """
    El mismo nombre sin el sufijo generacional.

    Las dos fuentes no coinciden en ellos: Basketball-Reference escribe
    "Jimmy Butler" donde la NBA pone "Jimmy Butler III". Se usa como
    segundo intento, nunca como primero, para no confundir a un padre con
    su hijo cuando ambos jugaron.
    """
    partes = normalizar(nombre).split()
    while partes and partes[-1] in SUFIJOS:
        partes.pop()
    return " ".join(partes)


def sync_contracts() -> None:
    print("Sincronizando contratos...")
    client = get_supabase_client()

    equipos = client.table("teams").select("id, abbreviation, full_name").execute().data

    # Plantilla por equipo, para acotar el cruce por nombre, y un indice
    # global de respaldo
    plantillas: dict[str, dict[str, str]] = {}
    global_por_nombre: dict[str, list[str]] = {}
    # Apellidos dentro de cada plantilla, ultimo recurso del cruce
    apellidos: dict[str, dict[str, list[str]]] = {}
    offset = 0
    while True:
        pagina = (
            client.table("players")
            .select("id, first_name, last_name, team_id")
            .order("id")
            .range(offset, offset + 999)
            .execute()
        )
        if not pagina.data:
            break
        for p in pagina.data:
            clave = normalizar(f"{p['first_name']} {p['last_name']}")
            global_por_nombre.setdefault(clave, []).append(p["id"])
            sin_suf = sin_sufijo(f"{p['first_name']} {p['last_name']}")
            if sin_suf != clave:
                global_por_nombre.setdefault(sin_suf, []).append(p["id"])
            if p["team_id"]:
                plantillas.setdefault(p["team_id"], {})[clave] = p["id"]
                plantillas[p["team_id"]].setdefault(sin_suf, p["id"])
                ape = sin_sufijo(p["last_name"])
                apellidos.setdefault(p["team_id"], {}).setdefault(ape, []).append(p["id"])
        if len(pagina.data) < 1000:
            break
        offset += 1000

    filas = []
    sin_casar: list[str] = []
    fallidas = 0

    for i, equipo in enumerate(equipos, 1):
        pagina = descargar_contratos(equipo["abbreviation"], CACHE)
        if not pagina:
            fallidas += 1
            print(f"   [{i}/{len(equipos)}] {equipo['abbreviation']}: no se pudo descargar")
            continue

        contratos = parsear_contratos(pagina)
        plantilla = plantillas.get(equipo["id"], {})
        casados = 0
        for c in contratos:
            clave = normalizar(c["player_name"])
            player_id = plantilla.get(clave) or plantilla.get(sin_sufijo(c["player_name"]))
            if not player_id:
                # Un cortado sigue cobrando de su antiguo equipo y ese
                # dinero cuenta para el tope, aunque ya no este en la
                # plantilla. Se busca en toda la liga, pero solo vale si el
                # nombre es unico.
                for busqueda in (clave, sin_sufijo(c["player_name"])):
                    candidatos = global_por_nombre.get(busqueda, [])
                    if len(candidatos) == 1:
                        player_id = candidatos[0]
                        break
            if not player_id:
                # Las fuentes usan diminutivos distintos ("Ron" frente a
                # "Ronald"). El apellido dentro de una sola plantilla es
                # practicamente unico, asi que ahi si vale.
                partes = sin_sufijo(c["player_name"]).split()
                if len(partes) > 1:
                    mismos = apellidos.get(equipo["id"], {}).get(" ".join(partes[1:]), [])
                    if len(mismos) == 1:
                        player_id = mismos[0]
            if not player_id:
                sin_casar.append(f"{equipo['abbreviation']} {c['player_name']}")
                continue
            casados += 1
            filas.append(
                {
                    "player_id": player_id,
                    "team_id": equipo["id"],
                    "season": c["season"],
                    "salary": c["salary"],
                }
            )
        print(f"   [{i}/{len(equipos)}] {equipo['abbreviation']}: {len(contratos)} filas, {casados} cruzadas")

    if fallidas:
        print(f"\n   {fallidas} equipos sin descargar")
    if sin_casar:
        unicos = sorted(set(sin_casar))
        print(f"   {len(unicos)} jugadores sin ficha en la app: {unicos[:6]}")

    # Un cortado pesa en la nomina de su antiguo equipo y en la del nuevo,
    # asi que la fila es unica por (jugador, equipo, temporada)
    vistos = set()
    limpias = []
    for f in filas:
        clave = (f["player_id"], f["team_id"], f["season"])
        if clave in vistos:
            continue
        vistos.add(clave)
        limpias.append(f)

    total = 0
    for i in range(0, len(limpias), BATCH_SIZE):
        resultado = client.table("player_contracts").upsert(limpias[i : i + BATCH_SIZE]).execute()
        total += len(resultado.data)

    print(f"\n✅ {total} contratos guardados")
    print("   por temporada:", dict(sorted(Counter(f["season"] for f in limpias).items())))


if __name__ == "__main__":
    sync_contracts()
