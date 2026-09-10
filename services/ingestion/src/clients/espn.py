
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
