
import re
import unicodedata

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
                "link": ((articulo.get("links") or {}).get("web") or {}).get("href"),
                "image_url": imagen,
                "published": str(articulo.get("published") or "").strip() or None,
                "team_names": sorted(set(equipos)),
                "player_names": sorted(set(jugadores)),
            }
        )

    return noticias
