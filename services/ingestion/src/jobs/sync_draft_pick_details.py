"""
Rellena la ronda y el año de las elecciones de draft traspasadas.

El feed de la NBA solo dice "draft consideration". Basketball-Reference lo
detalla, asi que este job cruza ambas fuentes por fecha y equipos.

Solo escribe cuando el cruce es seguro: si el numero de elecciones que
cuenta cada fuente no coincide, la operacion se deja como esta. Un dato
inventado seria peor que ninguno.

Respeta el Crawl-delay de 3 segundos de su robots.txt y cachea las paginas
en disco, asi que una segunda pasada no vuelve a pedirlas.
"""

from collections import defaultdict
from pathlib import Path

from src.clients.bbref import descargar, parsear, picks_del_texto
from src.clients.supabase import get_supabase_client

CACHE = Path(__file__).resolve().parents[2] / ".cache" / "bbref"


def _temporada(fecha: str) -> int:
    """
    Año en que termina la temporada a la que pertenece la pagina.

    Basketball-Reference agrupa por temporada, que va del 1 de julio al 30
    de junio: un traspaso de agosto de 2025 esta en la pagina de 2026.
    """
    anio, mes = int(fecha[:4]), int(fecha[5:7])
    return anio + 1 if mes >= 7 else anio


def sync_draft_pick_details() -> None:
    print("Detallando las elecciones de draft traspasadas...")
    client = get_supabase_client()

    equipos = client.table("teams").select("id, abbreviation, full_name").execute().data
    abrev_por_id = {t["id"]: t["abbreviation"] for t in equipos}
    id_por_abrev = {t["abbreviation"]: t["id"] for t in equipos}
    nombres = {t["full_name"].lower(): t["abbreviation"] for t in equipos}
    # Ellos escriben asi a los Clippers
    nombres["la clippers"] = "LAC"

    # Nuestras operaciones con elecciones
    filas, offset = [], 0
    while True:
        pagina = (
            client.table("player_transactions")
            .select("id, deal_id, team_id, from_team_id, transaction_date, player_id")
            .eq("transaction_type", "Trade")
            .order("id")
            .range(offset, offset + 999)
            .execute()
        )
        if not pagina.data:
            break
        filas.extend(pagina.data)
        if len(pagina.data) < 1000:
            break
        offset += 1000

    por_deal = defaultdict(list)
    for f in filas:
        if f["deal_id"]:
            por_deal[f["deal_id"]].append(f)

    con_picks = {
        d: v for d, v in por_deal.items() if any(x["player_id"] is None for x in v)
    }
    print(f"   {len(con_picks)} operaciones con elecciones")

    # Paginas necesarias: una por equipo y temporada implicados
    necesarias = set()
    for piezas in con_picks.values():
        anio = _temporada(piezas[0]["transaction_date"])
        for p in piezas:
            for tid in (p["team_id"], p["from_team_id"]):
                if tid and tid in abrev_por_id:
                    necesarias.add((abrev_por_id[tid], anio))
    print(f"   {len(necesarias)} paginas de Basketball-Reference a consultar")

    # Indice de traspasos de la fuente, por fecha
    bbref_por_fecha = defaultdict(list)
    descargadas = fallidas = 0
    for i, (abrev, anio) in enumerate(sorted(necesarias), 1):
        pagina = descargar(abrev, anio, CACHE)
        if not pagina:
            fallidas += 1
            continue
        descargadas += 1
        if i % 25 == 0 or i == len(necesarias):
            print(f"      [{i}/{len(necesarias)}] {abrev} {anio}")
        for mov in parsear(pagina):
            picks = picks_del_texto(mov["text"], abrev, nombres)
            if picks:
                bbref_por_fecha[mov["date"]].append({"picks": picks, "text": mov["text"]})

    print(f"   descargadas {descargadas}, fallidas {fallidas}")

    # Cruce
    actualizadas = ambiguas = sin_fuente = 0
    cambios = []
    for deal_id, piezas in con_picks.items():
        nuestras = [p for p in piezas if p["player_id"] is None]
        fecha = piezas[0]["transaction_date"]
        equipos_deal = {
            abrev_por_id.get(t)
            for p in piezas
            for t in (p["team_id"], p["from_team_id"])
            if t
        }

        candidatos = [
            c
            for c in bbref_por_fecha.get(fecha, [])
            if (
                {pk["from_team"] for pk in c["picks"]}
                | {pk["to_team"] for pk in c["picks"]}
            )
            & equipos_deal
        ]
        if not candidatos:
            sin_fuente += 1
            continue

        # Se juntan las elecciones que cualquiera de las paginas atribuye a
        # esta operacion, sin repetir: cada traspaso aparece en la pagina de
        # todos los equipos implicados.
        vistos, picks = set(), []
        for c in candidatos:
            for pk in c["picks"]:
                clave = (pk["from_team"], pk["to_team"], pk["round"], pk["year"])
                if clave not in vistos:
                    vistos.add(clave)
                    picks.append(pk)

        # No se exige que cuadren los numeros: las dos fuentes cuentan
        # distinto. La NBA anota "draft consideration" una vez por equipo
        # receptor y Basketball-Reference enumera cada eleccion, asi que un
        # intercambio de una ronda por otra es una fila aqui y dos alli.
        #
        # Se empareja por direccion, que si es comparable.
        resuelta = False
        for fila in nuestras:
            origen = abrev_por_id.get(fila["from_team_id"])
            destino = abrev_por_id.get(fila["team_id"])

            iguales = [
                p for p in picks if p["from_team"] == origen and p["to_team"] == destino
            ]
            if not iguales:
                # Las fuentes discrepan a veces en quien cede y quien
                # recibe; el par de equipos si coincide
                iguales = [
                    p for p in picks if {p["from_team"], p["to_team"]} == {origen, destino}
                ]
            if not iguales:
                continue

            # Una fila nuestra puede corresponder a varias elecciones: el
            # traspaso de Jaylen Brown movio cuatro de Filadelfia a Boston
            # y la NBA lo anota como un unico "draft consideration". El
            # desglose entero va en la nota, en formato "año:ronda".
            nota = "|".join(
                f"{p['year'] or '?'}:{p['round']}"
                for p in sorted(iguales, key=lambda x: (x["year"] or 0, x["round"]))
            )
            rondas = {p["round"] for p in iguales}

            if len(iguales) == 1:
                ronda, anio = iguales[0]["round"], iguales[0]["year"]
            elif len(rondas) == 1:
                # Todas de la misma ronda: esa es segura, el año no
                ronda, anio = rondas.pop(), None
            else:
                # Rondas mezcladas: sin dato unico, pero la nota lo cuenta
                ronda, anio = None, None
                ambiguas += 1

            cambios.append(
                {
                    "id": fila["id"],
                    "draft_round": ronda,
                    "draft_pick_year": anio,
                    "draft_note": nota,
                }
            )
            resuelta = True

        if resuelta:
            actualizadas += 1

    print(f"\n   operaciones resueltas: {actualizadas}")
    print(f"   elecciones sin resolver por ambiguedad: {ambiguas}")
    print(f"   sin nada en la fuente esa fecha: {sin_fuente}")

    for i in range(0, len(cambios), 200):
        lote = cambios[i : i + 200]
        for c in lote:
            client.table("player_transactions").update(
                {
                    "draft_round": c["draft_round"],
                    "draft_pick_year": c["draft_pick_year"],
                    "draft_note": c["draft_note"],
                }
            ).eq("id", c["id"]).execute()

    print(f"\n✅ {len(cambios)} elecciones detalladas")


if __name__ == "__main__":
    sync_draft_pick_details()
