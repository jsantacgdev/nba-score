"""
Movimientos de jugadores: traspasos, fichajes y cortes.

La NBA lo publica como un JSON suelto, fuera de los endpoints que envuelve
nba_api. Son unos 9.800 registros desde julio de 2015.

Es la unica fuente que distingue un traspaso de un corte o de un fichaje:
en player_season_teams un cambio de equipo puede ser cualquiera de los
tres y no hay forma de saber cual.
"""

import hashlib

import httpx

URL = "https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json"

# El JSON esta pensado para la web de la NBA y rechaza peticiones sin
# cabeceras de navegador.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Referer": "https://www.nba.com/",
}


def _id(value) -> str | None:
    """Los identificadores llegan como float: 1610612739.0."""
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
        team_id = _id(fila.get("TEAM_ID"))

        # El feed no trae identificador y repite algunos registros tal
        # cual, asi que la clave se deriva de lo que define el movimiento.
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
        }

    return list(movimientos.values())
