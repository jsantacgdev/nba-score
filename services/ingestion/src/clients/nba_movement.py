
import hashlib
import re

import httpx

URL = "https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Referer": "https://www.nba.com/",
}

ALIAS_EQUIPOS = {"LA Clippers": "Los Angeles Clippers"}

def equipo_origen(descripcion: str) -> str | None:
    encontrado = re.search(r" from (.+?)\.?$", descripcion)
    if not encontrado:
        return None
    nombre = encontrado.group(1).strip().rstrip(".")
    return ALIAS_EQUIPOS.get(nombre, nombre)

def deal_id(group_sort) -> str | None:
    """
    Identificador de la operacion, tal y como la agrupa la NBA.

    GroupSort llega como "Trade 2025031" y es la propia numeracion de la
    liga: todas las piezas de un mismo traspaso lo comparten, incluidas las
    de un tres bandas, y nunca abarca mas de un dia.

    Antes esto se deducia con un union-find sobre los equipos que se
    intercambiaban jugadores. Funcionaba en los casos faciles, pero en dia
    de mercado encadenaba traspasos sin relacion hasta juntar veinte
    equipos en una sola "operacion", porque basta que dos acuerdos
    compartan un equipo para que se fusionen. Este campo lo resuelve sin
    heuristica.

    Se normaliza a minusculas y sin espacios porque viaja en una ruta.
    """
    texto = str(group_sort or "").strip()
    if not texto:
        return None
    return texto.lower().replace(" ", "-")


def _id(value) -> str | None:
    if value is None:
        return None
    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        texto = str(value).strip()
        return texto or None

def get_player_movement() -> list[dict]:
    response = httpx.get(URL, headers=HEADERS, timeout=90)
    response.raise_for_status()
    filas = response.json()["NBA_Player_Movement"]["rows"]

    movimientos: dict[str, dict] = {}
    for fila in filas:
        fecha = str(fila.get("TRANSACTION_DATE") or "")[:10]
        descripcion = str(fila.get("TRANSACTION_DESCRIPTION") or "").strip()
        tipo = str(fila.get("Transaction_Type") or "").strip()
        if not fecha or not descripcion or not tipo:
            continue

        player_id = _id(fila.get("PLAYER_ID"))
        if player_id == "0":
            player_id = None
        team_id = _id(fila.get("TEAM_ID"))

        semilla = f"{player_id}|{team_id}|{fecha}|{tipo}|{descripcion}"
        clave = hashlib.md5(semilla.encode("utf-8")).hexdigest()

        movimientos[clave] = {
            "id": clave,
            "player_id": player_id,
            "team_id": team_id,
            "transaction_type": tipo,
            "transaction_date": fecha,
            "description": descripcion,
            "player_slug": (str(fila.get("PLAYER_SLUG") or "").strip() or None),
            "team_slug": (str(fila.get("TEAM_SLUG") or "").strip() or None),
            "from_team_id_nombre": equipo_origen(descripcion),
            "deal_id": deal_id(fila.get("GroupSort")),
        }

    return list(movimientos.values())
