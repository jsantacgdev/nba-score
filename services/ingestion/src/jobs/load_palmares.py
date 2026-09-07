"""
Carga el palmares de equipos desde data/palmares.json.

Los campeonatos anteriores a 1983-84 no existen en la API de la NBA: no
hay ni un partido registrado. Esa parte del fichero es una lista curada a
mano y validada contra el recuento oficial de titulos por franquicia que
publica el endpoint FranchiseHistory.

La NBA Cup tampoco esta en la API como competicion, asi que sus ganadores
salen tambien del fichero.

Es idempotente: hace upsert, asi que se puede relanzar sin duplicar.
"""

import io
import json
import os

from src.clients.supabase import get_supabase_client

RUTA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "palmares.json",
)


def load_palmares(path: str = RUTA) -> None:
    print(f"Leyendo {path}...")
    datos = json.load(io.open(path, encoding="utf-8"))

    filas = []
    for x in datos.get("campeonatos_nba", []):
        filas.append(
            {
                "season": x["season"],
                "competition": "nba",
                "team_id": x.get("team_id"),
                "decided_at": None,
            }
        )
    for x in datos.get("nba_cup", []):
        filas.append(
            {
                "season": x["season"],
                "competition": "nba_cup",
                "team_id": x.get("team_id"),
                "decided_at": None,
            }
        )

    print(f"   {len(filas)} titulos en el fichero")

    client = get_supabase_client()

    # Las fechas exactas de los titulos que vinieron de la API ya estan en
    # la tabla; no las pisamos con nulos.
    existentes = {
        (r["season"], r["competition"]): r["decided_at"]
        for r in client.table("season_champions")
        .select("season,competition,decided_at")
        .execute()
        .data
    }

    for f in filas:
        fecha = existentes.get((f["season"], f["competition"]))
        if fecha:
            f["decided_at"] = fecha
        else:
            f.pop("decided_at")

    # Los equipos deben existir para no romper la clave foranea
    validos = {t["id"] for t in client.table("teams").select("id").execute().data}
    descartadas = [f for f in filas if f["team_id"] and f["team_id"] not in validos]
    if descartadas:
        print(f"   {len(descartadas)} descartadas por equipo desconocido")
        filas = [f for f in filas if not f["team_id"] or f["team_id"] in validos]

    total = 0
    for i in range(0, len(filas), 200):
        result = client.table("season_champions").upsert(filas[i : i + 200]).execute()
        total += len(result.data)

    print(f"\n{total} titulos guardados")

    # Resumen de control
    todos = client.table("season_champions").select("season,competition,team_id").execute().data
    nba = [x for x in todos if x["competition"] == "nba"]
    cup = [x for x in todos if x["competition"] == "nba_cup"]
    print(f"   NBA: {len(nba)} temporadas ({min(x['season'] for x in nba)} .. "
          f"{max(x['season'] for x in nba)})")
    print(f"   NBA Cup: {len(cup)} temporadas")
    sin_equipo = [x for x in todos if not x["team_id"]]
    if sin_equipo:
        print(f"   Sin franquicia actual: {[x['season'] for x in sin_equipo]}")


if __name__ == "__main__":
    load_palmares()
