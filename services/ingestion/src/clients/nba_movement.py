
import hashlib
import re
from collections import defaultdict

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

def agrupar_operaciones(movimientos: list[dict]) -> None:
    por_fecha: dict[str, list[dict]] = defaultdict(list)
    for m in movimientos:
        if m["transaction_type"] == "Trade" and m["from_team_id_nombre"]:
            por_fecha[m["transaction_date"]].append(m)

    for fecha, filas in por_fecha.items():
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
            "deal_id": clave,
        }

    lista = list(movimientos.values())
    agrupar_operaciones(lista)
    return lista
