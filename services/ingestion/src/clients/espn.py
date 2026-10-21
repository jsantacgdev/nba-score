
import re
import unicodedata
from datetime import date, datetime
from urllib.parse import urlsplit, urlunsplit

import httpx

URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"

def normalizar_nombre(nombre: str) -> str:
    limpio = unicodedata.normalize("NFKD", nombre or "")
    limpio = limpio.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z ]", "", limpio.lower()).strip()

def _espn_athlete_id(athlete: dict) -> str | None:
    for enlace in athlete.get("links") or []:
        encontrado = re.search(r"/id/(\d+)/", str(enlace.get("href") or ""))
        if encontrado:
            return encontrado.group(1)
    return None

def get_injuries() -> list[dict]:
    response = httpx.get(URL, timeout=60)
    response.raise_for_status()
    datos = response.json()

    lesiones = []
    for equipo in datos.get("injuries") or []:
        nombre_equipo = str(equipo.get("displayName") or "").strip()

        for lesion in equipo.get("injuries") or []:
            atleta = lesion.get("athlete") or {}
            detalles = lesion.get("details") or {}

            nombre = str(atleta.get("displayName") or "").strip()
            if not nombre:
                continue

            vuelta = str(detalles.get("returnDate") or "").strip()[:10] or None

            lesiones.append(
                {
                    "id": str(lesion.get("id") or "").strip(),
                    "player_name": nombre,
                    "nombre_normalizado": normalizar_nombre(nombre),
                    "espn_athlete_id": _espn_athlete_id(atleta),
                    "nombre_equipo": nombre_equipo,
                    "status": str(lesion.get("status") or "").strip() or None,
                    "injury_type": str(detalles.get("type") or "").strip() or None,
                    "side": str(detalles.get("side") or "").strip() or None,
                    "return_date": vuelta,
                    "short_comment": str(lesion.get("shortComment") or "").strip() or None,
                    "long_comment": str(lesion.get("longComment") or "").strip() or None,
                    "reported_at": str(lesion.get("date") or "").strip() or None,
                }
            )

    return [l for l in lesiones if l["id"]]


# ============================================
# Noticias
# ============================================

URL_NOTICIAS = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news"



# ESPN da el enlace en www.espn.es, que no sirve articulos: cualquier ruta
# acaba en 302 a la portada de ESPN Deportes y el titular se pierde. El
# identificador y la ruta si valen, asi que solo hay que cambiar el
# dominio por el que los sirve de verdad.
#
# Comprobado sobre las 53 noticias que teniamos guardadas: las 53 usan ese
# dominio, y las probadas llegan al articulo con el cambio.
HOST_SIN_ARTICULOS = "www.espn.es"
HOST_CON_ARTICULOS = "espndeportes.espn.com"


def enlace_al_articulo(url: str | None) -> str | None:
    if not url:
        return None
    partes = urlsplit(url)
    if partes.netloc != HOST_SIN_ARTICULOS:
        return url
    return urlunsplit(
        ("https", HOST_CON_ARTICULOS, partes.path, partes.query, partes.fragment)
    )

# Los videos se descartan: su titular es de tertulia, no de noticia
TIPOS_DESCARTADOS = {"Media"}


def get_news(limite: int = 50) -> list[dict]:
    """
    Titulares de la NBA en castellano, ya redactados por ESPN Deportes.

    Con lang=es y region=es la misma API devuelve su edicion en castellano,
    con titular y resumen escritos por sus periodistas y enlace a espn.es.
    No es una traduccion de la edicion inglesa sino otra redaccion: los
    identificadores no coinciden y la seleccion de temas es distinta.

    Conserva las etiquetas de equipo y jugador, que es lo que permite
    llevar cada noticia a su ficha y no dejarla en un muro suelto. Sus
    identificadores no son los de la NBA, asi que aqui solo se extraen los
    nombres; el cruce lo hace el job, que es quien conoce la base.
    """
    response = httpx.get(
        URL_NOTICIAS,
        params={"limit": limite, "lang": "es", "region": "es"},
        timeout=60,
    )
    response.raise_for_status()

    noticias = []
    for articulo in response.json().get("articles") or []:
        identificador = str(articulo.get("id") or "").strip()
        titular = str(articulo.get("headline") or "").strip()
        if not identificador or not titular:
            continue
        if str(articulo.get("type") or "") in TIPOS_DESCARTADOS:
            continue

        equipos, jugadores = [], []
        for categoria in articulo.get("categories") or []:
            tipo = categoria.get("type")
            if tipo == "team":
                nombre = (categoria.get("team") or {}).get("description") or categoria.get(
                    "description"
                )
                if nombre:
                    equipos.append(str(nombre).strip())
            elif tipo == "athlete":
                nombre = (categoria.get("athlete") or {}).get("description") or categoria.get(
                    "description"
                )
                if nombre:
                    jugadores.append(str(nombre).strip())

        imagen = None
        for img in articulo.get("images") or []:
            if img.get("url"):
                imagen = str(img["url"])
                break

        noticias.append(
            {
                "id": identificador,
                "headline": titular,
                "description": str(articulo.get("description") or "").strip() or None,
                "link": enlace_al_articulo(
                    ((articulo.get("links") or {}).get("web") or {}).get("href")
                ),
                "image_url": imagen,
                "published": str(articulo.get("published") or "").strip() or None,
                "team_names": sorted(set(equipos)),
                "player_names": sorted(set(jugadores)),
            }
        )

    return noticias


# ============================================
# Partidos: marcador, box score y titulares
# ============================================

BASE_PARTIDOS = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"

ABREVIATURAS_ESPN = {
    "GS": "GSW",
    "NO": "NOP",
    "NY": "NYK",
    "SA": "SAS",
    "UTAH": "UTA",
    "WSH": "WAS",
}

ESTADOS_INCOMPLETOS = {"STATUS_POSTPONED", "STATUS_CANCELED", "STATUS_SUSPENDED"}


def abreviatura(valor) -> str:
    limpia = str(valor or "").strip().upper()
    return ABREVIATURAS_ESPN.get(limpia, limpia)


def _fecha_utc(valor) -> datetime | None:
    texto = str(valor or "").strip()
    if not texto:
        return None
    try:
        return datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return None


def _entero(valor) -> int:
    texto = str(valor or "").strip().replace("+", "")
    if not texto or texto in ("-", "--"):
        return 0
    try:
        return int(float(texto))
    except ValueError:
        return 0


def get_scoreboard(dia: date) -> list[dict]:
    respuesta = httpx.get(
        f"{BASE_PARTIDOS}/scoreboard",
        params={"dates": dia.strftime("%Y%m%d"), "limit": 100},
        timeout=60,
    )
    respuesta.raise_for_status()

    partidos = []
    for evento in respuesta.json().get("events") or []:
        competicion = (evento.get("competitions") or [{}])[0]

        lados = {}
        for competidor in competicion.get("competitors") or []:
            lados[competidor.get("homeAway")] = competidor
        local = lados.get("home")
        visitante = lados.get("away")
        if not local or not visitante:
            continue

        estado = (competicion.get("status") or {}).get("type") or {}
        nombre_estado = str(estado.get("name") or "")
        if nombre_estado in ESTADOS_INCOMPLETOS:
            continue

        fase = str(estado.get("state") or "")
        if fase == "pre":
            situacion = "scheduled"
        elif fase == "in":
            situacion = "live"
        elif fase == "post" and estado.get("completed"):
            situacion = "final"
        else:
            continue

        empieza = _fecha_utc(competicion.get("date") or evento.get("date"))
        if not empieza:
            continue

        reloj = str((competicion.get("status") or {}).get("displayClock") or "").strip()

        partidos.append(
            {
                "espn_event_id": str(evento.get("id") or "").strip(),
                "starts_at": empieza,
                "home_abbr": abreviatura((local.get("team") or {}).get("abbreviation")),
                "away_abbr": abreviatura((visitante.get("team") or {}).get("abbreviation")),
                "score_home": _entero(local.get("score")),
                "score_away": _entero(visitante.get("score")),
                "status": situacion,
                "period": _entero((competicion.get("status") or {}).get("period")),
                "clock": reloj or None,
            }
        )

    return [p for p in partidos if p["espn_event_id"]]


ETIQUETAS_SIMPLES = {
    "PTS": "points",
    "REB": "rebounds",
    "AST": "assists",
    "STL": "steals",
    "BLK": "blocks",
    "TO": "turnovers",
}

ETIQUETAS_PARES = {
    "FG": ("fg_made", "fg_attempted"),
    "3PT": ("fg3_made", "fg3_attempted"),
    "FT": ("ft_made", "ft_attempted"),
}

CAMPOS_BOX_SCORE = (
    "points",
    "rebounds",
    "assists",
    "steals",
    "blocks",
    "turnovers",
    "fg_made",
    "fg_attempted",
    "fg3_made",
    "fg3_attempted",
    "ft_made",
    "ft_attempted",
    "plus_minus",
)


def _par(valor) -> tuple[int, int]:
    texto = str(valor or "").strip()
    if "-" not in texto:
        return 0, 0
    hechos, _, intentos = texto.partition("-")
    return _entero(hechos), _entero(intentos)


def get_box_score(espn_event_id: str) -> list[dict]:
    respuesta = httpx.get(
        f"{BASE_PARTIDOS}/summary",
        params={"event": str(espn_event_id)},
        timeout=60,
    )
    respuesta.raise_for_status()

    jugadores = []
    for equipo in (respuesta.json().get("boxscore") or {}).get("players") or []:
        abbr = abreviatura((equipo.get("team") or {}).get("abbreviation"))
        bloques = equipo.get("statistics") or []
        if not bloques:
            continue

        etiquetas = [str(n).upper() for n in bloques[0].get("names") or []]
        titular = 0

        for atleta in bloques[0].get("athletes") or []:
            if atleta.get("didNotPlay"):
                continue

            ficha = atleta.get("athlete") or {}
            nombre = str(ficha.get("displayName") or "").strip()
            if not nombre:
                continue

            valores = atleta.get("stats") or []
            if len(valores) < len(etiquetas):
                continue

            fila = {campo: 0 for campo in CAMPOS_BOX_SCORE}
            fila["minutes"] = 0.0

            for etiqueta, valor in zip(etiquetas, valores):
                if etiqueta == "MIN":
                    fila["minutes"] = float(_entero(valor))
                elif etiqueta == "+/-":
                    fila["plus_minus"] = _entero(valor)
                elif etiqueta in ETIQUETAS_SIMPLES:
                    fila[ETIQUETAS_SIMPLES[etiqueta]] = _entero(valor)
                elif etiqueta in ETIQUETAS_PARES:
                    hechos, intentos = ETIQUETAS_PARES[etiqueta]
                    fila[hechos], fila[intentos] = _par(valor)

            es_titular = bool(atleta.get("starter"))
            spot = titular if es_titular else None
            if es_titular:
                titular += 1

            posicion = str((ficha.get("position") or {}).get("abbreviation") or "").strip()

            jugadores.append(
                {
                    **fila,
                    "espn_athlete_id": str(ficha.get("id") or "").strip() or None,
                    "nombre": nombre,
                    "nombre_normalizado": normalizar_nombre(nombre),
                    "team_abbr": abbr,
                    "starter": es_titular,
                    "spot": spot,
                    "position": posicion or None,
                }
            )

    return jugadores
