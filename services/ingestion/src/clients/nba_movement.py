"""
Movimientos de jugadores: traspasos, fichajes y cortes.

La NBA lo publica como un JSON suelto, fuera de los endpoints que envuelve
nba_api. Son unos 9.800 registros desde julio de 2015.

Es la unica fuente que distingue un traspaso de un corte o de un fichaje:
en player_season_teams un cambio de equipo puede ser cualquiera de los
tres y no hay forma de saber cual.
"""

import hashlib
import re
from collections import defaultdict

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


# El texto usa un nombre distinto al oficial para un solo equipo
ALIAS_EQUIPOS = {"LA Clippers": "Los Angeles Clippers"}


def equipo_origen(descripcion: str) -> str | None:
    """
    El equipo que cede va al final del texto: "... from Dallas Mavericks."

    Lo llevan los 1.798 traspasos; en fichajes y cortes no hay origen.
    """
    encontrado = re.search(r" from (.+?)\.?$", descripcion)
    if not encontrado:
        return None
    nombre = encontrado.group(1).strip().rstrip(".")
    return ALIAS_EQUIPOS.get(nombre, nombre)


def agrupar_operaciones(movimientos: list[dict]) -> None:
    """
    Marca con el mismo deal_id las filas de una misma operacion.

    El feed parte cada traspaso en una fila por jugador y equipo receptor,
    asi que el de Doncic llega en nueve filas repartidas entre Mavericks,
    Lakers y Jazz. Se reagrupan por fecha y equipos conectados: si A cede a
    B y B cede a C, los tres van juntos.

    Solo se agrupan los traspasos. Un fichaje o un corte son operaciones de
    un solo equipo y se quedan con su propio identificador.
    """
    por_fecha: dict[str, list[dict]] = defaultdict(list)
    for m in movimientos:
        if m["transaction_type"] == "Trade" and m["from_team_id_nombre"]:
            por_fecha[m["transaction_date"]].append(m)

    for fecha, filas in por_fecha.items():
        # Componentes conexas de equipos, con un union-find sencillo
        padre: dict[str, str] = {}

        def raiz(x: str) -> str:
            padre.setdefault(x, x)
            while padre[x] != x:
                padre[x] = padre[padre[x]]
                x = padre[x]
            return x

        def unir(a: str, b: str) -> None:
            ra, rb = raiz(a), raiz(b)
            if ra != rb:
                padre[ra] = rb

        for f in filas:
            unir(f["team_slug"] or "?", f["from_team_id_nombre"])

        for f in filas:
            grupo = raiz(f["team_slug"] or "?")
            f["deal_id"] = hashlib.md5(f"{fecha}|{grupo}".encode("utf-8")).hexdigest()[:16]


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

        # En las elecciones de draft no hay jugador y el feed pone un 0,
        # que no es ningun identificador real
        player_id = _id(fila.get("PLAYER_ID"))
        if player_id == "0":
            player_id = None
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
            # Se resuelve a identificador en el job, que es quien conoce
            # la tabla de equipos
            "from_team_id_nombre": equipo_origen(descripcion),
            "deal_id": clave,
        }

    lista = list(movimientos.values())
    agrupar_operaciones(lista)
    return lista
