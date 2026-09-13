"""
Detalle de las elecciones de draft, desde Basketball-Reference.

Ni la NBA ni ESPN dicen si una eleccion traspasada es de primera o de
segunda ronda: el feed de la NBA repite 518 veces "draft consideration" y
ESPN solo lo detalla en un tercio de los casos, en prosa y sin garantia de
que la frase hable de esa misma operacion.

Basketball-Reference si lo publica entero, con ronda, año, direccion y
hasta las protecciones:

    Traded Anfernee Simons and a 2026 2nd round draft pick to the Chicago
    Bulls for Nikola Vucevic and a 2027 2nd round draft pick.

Se respeta el Crawl-delay de 3 segundos que fija su robots.txt, y las
paginas se cachean en disco para no volver a pedirlas.
"""

import html
import re
import time
from pathlib import Path

import httpx

BASE = "https://www.basketball-reference.com/teams/{equipo}/{anio}_transactions.html"

# Su robots.txt fija Crawl-delay: 3
ESPERA_SEGUNDOS = 3.0

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
}

# Abreviaturas que usan ellos y no coinciden con las de la NBA
ALIAS_BBREF = {
    "BRK": "BKN",
    "CHO": "CHA",
    "PHO": "PHX",
}

# El mismo mapa al reves, para construir la URL. Sin esto, Brooklyn,
# Charlotte y Phoenix devuelven 404 en todas sus temporadas.
ABREV_EN_URL = {nuestra: suya for suya, nuestra in ALIAS_BBREF.items()}

_ultima_peticion = 0.0


def _texto(fragmento: str) -> str:
    """Quita etiquetas y normaliza espacios."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragmento))).strip()


def descargar(equipo: str, anio: int, cache: Path | None = None) -> str | None:
    """
    Baja la pagina de transacciones de un equipo y temporada.

    `anio` es el año en que termina la temporada: 2026 para 2025-26.
    """
    global _ultima_peticion

    equipo_url = ABREV_EN_URL.get(equipo, equipo)
    destino = cache / f"{equipo}_{anio}.html" if cache else None
    if destino and destino.exists():
        return destino.read_text(encoding="utf-8", errors="ignore")

    espera = ESPERA_SEGUNDOS - (time.time() - _ultima_peticion)
    if espera > 0:
        time.sleep(espera)

    try:
        respuesta = httpx.get(
            BASE.format(equipo=equipo_url, anio=anio),
            headers=HEADERS,
            timeout=40,
            follow_redirects=True,
        )
        _ultima_peticion = time.time()
    except Exception:
        _ultima_peticion = time.time()
        return None

    if respuesta.status_code != 200:
        return None

    if destino:
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(respuesta.text, encoding="utf-8")
    return respuesta.text


MESES = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}


def _fecha(texto: str) -> str | None:
    """'July 7, 2025' -> '2025-07-07'."""
    encontrado = re.match(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", texto.strip())
    if not encontrado:
        return None
    mes = MESES.get(encontrado.group(1).lower())
    if not mes:
        return None
    return f"{encontrado.group(3)}-{mes:02d}-{int(encontrado.group(2)):02d}"


def parsear(pagina: str) -> list[dict]:
    """
    Saca los movimientos de la pagina: fecha, texto y a quien afectan.

    Devuelve tambien los identificadores que trae el HTML: los jugadores
    van enlazados a su ficha y los equipos llevan su abreviatura en
    data-attr-to, lo que evita tener que adivinarlos del texto.
    """
    bloque = re.search(r"<ul class='page_index'>(.*?)</ul>", pagina, re.S)
    if not bloque:
        return []

    movimientos = []
    for fecha_cruda, cuerpo in re.findall(
        r"<li>\s*<span><span>(.*?)</span></span>(.*?)</li>", bloque.group(1), re.S
    ):
        fecha = _fecha(_texto(fecha_cruda))
        if not fecha:
            continue

        for bruto in re.findall(r'<p class="transaction[^"]*">(.*?)</p>', cuerpo, re.S):
            jugadores = [
                _texto(n)
                for n in re.findall(r"<a href=['\"]/players/[^'\"]*['\"][^>]*>(.*?)</a>", bruto)
            ]
            equipos = [
                ALIAS_BBREF.get(a, a) for a in re.findall(r'data-attr-to="([A-Z]{3})"', bruto)
            ]
            movimientos.append(
                {
                    "date": fecha,
                    "text": _texto(bruto),
                    "html": bruto,
                    "players": jugadores,
                    "teams": equipos,
                }
            )

    return movimientos


# "a 2026 2nd round draft pick" y variantes sin año
PATRON_PICK = re.compile(r"(?:(\d{4})\s+)?(1st|2nd)\s+round\s+draft\s+pick", re.I)


def _equipo_en(texto: str, nombres: dict[str, str]) -> str | None:
    """Primera abreviatura cuyo nombre aparezca en el texto."""
    mejor, pos_mejor = None, len(texto) + 1
    for nombre, abrev in nombres.items():
        pos = texto.lower().find(nombre)
        if pos != -1 and pos < pos_mejor:
            mejor, pos_mejor = abrev, pos
    return mejor


def picks_del_texto(texto: str, equipo_pagina: str, nombres: dict[str, str]) -> list[dict]:
    """
    Elecciones mencionadas, con quien las cede y quien las recibe.

    Se parte por clausulas porque un traspaso a varias bandas las encadena:

        ... los Lakers traspasaron a Davis y una 1a ronda de 2029 a los
        Mavericks ; los Lakers traspasaron a Hood-Schifino y una 2a ronda
        de 2025 a los Jazz ; los Jazz traspasaron una 2a ronda de 2025 a
        los Mavericks

    No sirve mirar los enlaces del HTML: Basketball-Reference solo enlaza
    el equipo de DESTINO de cada clausula, y el sujeto va en texto plano,
    asi que el enlace anterior a una eleccion es el destino de la clausula
    anterior y la direccion sale invertida.

    En los traspasos a dos bandas el texto va en primera persona
    ("Traspasados X y una eleccion a los Bulls por Vucevic y una
    eleccion"), y ahi el sujeto es el equipo de la pagina: lo que va antes
    del " for " lo cede el, y lo que va despues lo recibe.
    """
    picks = []

    if " ; " in texto or "; " in texto:
        clausulas = re.split(r"\s*;\s*(?:and\s+)?", texto)
        for clausula in clausulas:
            hallados = list(PATRON_PICK.finditer(clausula))
            if not hallados:
                continue
            partes = clausula.split(" to the ", 1)
            cede = _equipo_en(partes[0], nombres) or equipo_pagina
            recibe = _equipo_en(partes[1], nombres) if len(partes) > 1 else None
            for h in hallados:
                picks.append(
                    {
                        "year": int(h.group(1)) if h.group(1) else None,
                        "round": 1 if h.group(2).lower() == "1st" else 2,
                        "from_team": cede,
                        "to_team": recibe or equipo_pagina,
                    }
                )
        return picks

    # Traspaso simple, contado desde el equipo de la pagina
    corte = texto.lower().find(" for ")
    cedido = texto[:corte] if corte != -1 else texto
    recibido = texto[corte:] if corte != -1 else ""
    otro = _equipo_en(cedido, nombres) or _equipo_en(recibido, nombres)

    for trozo, sale in ((cedido, True), (recibido, False)):
        for h in PATRON_PICK.finditer(trozo):
            picks.append(
                {
                    "year": int(h.group(1)) if h.group(1) else None,
                    "round": 1 if h.group(2).lower() == "1st" else 2,
                    "from_team": equipo_pagina if sale else otro,
                    "to_team": otro if sale else equipo_pagina,
                }
            )
    return picks


# ============================================
# Contratos
# ============================================

URL_CONTRATOS = "https://www.basketball-reference.com/contracts/{equipo}.html"

def _es_temporada(texto: str) -> bool:
    """Forma "2026-27". Se comprueba a mano para no depender de regex."""
    return (
        len(texto) == 7
        and texto[:4].isdigit()
        and texto[4] == "-"
        and texto[5:].isdigit()
    )


def _dinero(texto: str) -> int | None:
    """"$58,456,566" -> 58456566."""
    limpio = texto.strip()
    if not limpio.startswith("$"):
        return None
    try:
        return int(limpio[1:].replace(",", "").split(".")[0])
    except ValueError:
        return None


def descargar_contratos(equipo: str, cache: Path | None = None) -> str | None:
    """Pagina de contratos vigentes de un equipo."""
    global _ultima_peticion

    equipo_url = ABREV_EN_URL.get(equipo, equipo)
    destino = cache / f"contratos_{equipo}.html" if cache else None
    if destino and destino.exists():
        return destino.read_text(encoding="utf-8", errors="ignore")

    espera = ESPERA_SEGUNDOS - (time.time() - _ultima_peticion)
    if espera > 0:
        time.sleep(espera)

    try:
        respuesta = httpx.get(
            URL_CONTRATOS.format(equipo=equipo_url),
            headers=HEADERS,
            timeout=40,
            follow_redirects=True,
        )
        _ultima_peticion = time.time()
    except Exception:
        _ultima_peticion = time.time()
        return None

    if respuesta.status_code != 200:
        return None

    if destino:
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(respuesta.text, encoding="utf-8")
    return respuesta.text


def parsear_contratos(pagina: str) -> list[dict]:
    """
    Salario de cada jugador por temporada.

    La tabla viene dentro de un comentario HTML, que es como
    Basketball-Reference dificulta el rascado, asi que primero se destapa.

    La cabecera trae las temporadas ("2026-27", "2027-28"...) y cada fila
    un jugador con su salario en cada una. Las celdas vacias son años sin
    contrato y se omiten.
    """
    destapado = pagina.replace("<!--", "").replace("-->", "")

    tabla = re.search(r'<table[^>]*id="contracts"[^>]*>(.*?)</table>', destapado, re.S)
    if not tabla:
        return []
    cuerpo = tabla.group(1)

    filas = re.findall(r"<tr[^>]*>(.*?)</tr>", cuerpo, re.S)
    if not filas:
        return []

    # La primera fila con celdas es la cabecera con las temporadas
    temporadas: list[str] = []
    for fila in filas:
        celdas = [_texto(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", fila, re.S)]
        if any(_es_temporada(c) for c in celdas):
            temporadas = celdas
            break
    if not temporadas:
        return []

    contratos = []
    for fila in filas:
        # Mezclan comillas simples y dobles en los href
        enlace = re.search(r"<a href=['\"]/players/[^'\"]*['\"][^>]*>(.*?)</a>", fila)
        if not enlace:
            continue
        nombre = _texto(enlace.group(1))
        celdas = [_texto(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", fila, re.S)]

        for i, celda in enumerate(celdas):
            if i >= len(temporadas):
                break
            temporada = temporadas[i]
            if not _es_temporada(temporada):
                continue
            importe = _dinero(celda)
            if importe is None:
                continue
            contratos.append(
                {
                    "player_name": nombre,
                    "season": temporada,
                    "salary": importe,
                }
            )

    return contratos


# ============================================
# Fichas de jugador: indice y sueldos historicos
# ============================================

URL_INDICE = "https://www.basketball-reference.com/players/{letra}/"
URL_JUGADOR = "https://www.basketball-reference.com/players/{letra}/{bbref_id}.html"


def _descargar(url: str, destino: Path | None) -> str | None:
    """Descarga respetando el Crawl-delay, con cache en disco."""
    global _ultima_peticion

    if destino and destino.exists():
        return destino.read_text(encoding="utf-8", errors="ignore")

    espera = ESPERA_SEGUNDOS - (time.time() - _ultima_peticion)
    if espera > 0:
        time.sleep(espera)

    try:
        respuesta = httpx.get(url, headers=HEADERS, timeout=40, follow_redirects=True)
        _ultima_peticion = time.time()
    except Exception:
        _ultima_peticion = time.time()
        return None

    if respuesta.status_code != 200:
        return None

    if destino:
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(respuesta.text, encoding="utf-8")
    return respuesta.text


def descargar_indice(letra: str, cache: Path | None = None) -> str | None:
    """Indice de jugadores cuyo apellido empieza por esa letra."""
    destino = cache / f"indice_{letra}.html" if cache else None
    return _descargar(URL_INDICE.format(letra=letra), destino)


def parsear_indice(pagina: str) -> list[dict]:
    """
    Jugadores del indice: identificador, nombre y años en activo.

    Los años sirven para desempatar cuando dos jugadores comparten nombre,
    que con casi 5.000 fichas historicas pasa mas de lo que parece.
    """
    tabla = re.search(r'<table[^>]*id="players"[^>]*>(.*?)</table>', pagina, re.S)
    if not tabla:
        return []

    jugadores = []
    for fila in re.findall(r"<tr[^>]*>(.*?)</tr>", tabla.group(1), re.S):
        enlace = re.search(
            r"<a href=['\"]/players/[a-z]/([a-z0-9]+)\.html['\"][^>]*>(.*?)</a>", fila
        )
        if not enlace:
            continue
        celdas = [_texto(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", fila, re.S)]
        desde = celdas[1] if len(celdas) > 1 and celdas[1].isdigit() else None
        hasta = celdas[2] if len(celdas) > 2 and celdas[2].isdigit() else None
        jugadores.append(
            {
                "bbref_id": enlace.group(1),
                "name": _texto(enlace.group(2)),
                "from_year": int(desde) if desde else None,
                "to_year": int(hasta) if hasta else None,
            }
        )
    return jugadores


def descargar_jugador(bbref_id: str, cache: Path | None = None) -> str | None:
    """Ficha personal de un jugador."""
    destino = cache / f"jugador_{bbref_id}.html" if cache else None
    return _descargar(URL_JUGADOR.format(letra=bbref_id[0], bbref_id=bbref_id), destino)


def parsear_salarios(pagina: str) -> list[dict]:
    """
    Lo cobrado por temporada, con el equipo que lo pagaba.

    La tabla va dentro de un comentario HTML y termina con una fila de
    total de carrera, que se descarta: no es una temporada.
    """
    destapado = pagina.replace("<!--", "").replace("-->", "")
    tabla = re.search(r'<table[^>]*id="all_salaries"[^>]*>(.*?)</table>', destapado, re.S)
    if not tabla:
        return []

    salarios = []
    for fila in re.findall(r"<tr[^>]*>(.*?)</tr>", tabla.group(1), re.S):
        celdas = [_texto(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", fila, re.S)]
        if len(celdas) < 4:
            continue
        temporada, equipo, _liga, importe = celdas[0], celdas[1], celdas[2], celdas[3]
        if not _es_temporada(temporada):
            continue
        dinero = _dinero(importe)
        if dinero is None:
            continue
        salarios.append({"season": temporada, "team_name": equipo, "salary": dinero})

    return salarios
