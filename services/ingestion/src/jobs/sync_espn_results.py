from datetime import datetime, timedelta, timezone

from src.clients.espn import get_box_score, get_scoreboard, normalizar_nombre
from src.clients.supabase import get_supabase_client

MARGEN_CRUCE = timedelta(hours=12)

CAMPOS_LOG = (
    "minutes",
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


def _fecha(valor) -> datetime | None:
    try:
        return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _paginado(client, tabla: str, columnas: str, orden: str) -> list[dict]:
    filas: list[dict] = []
    tamano = 1000
    offset = 0
    while True:
        lote = (
            client.table(tabla)
            .select(columnas)
            .order(orden)
            .range(offset, offset + tamano - 1)
            .execute()
            .data
        )
        if not lote:
            break
        filas.extend(lote)
        if len(lote) < tamano:
            break
        offset += tamano
    return filas


def _clave(away_abbr: str, home_abbr: str) -> str:
    return f"{away_abbr}@{home_abbr}"


def sync_espn_results(
    days_back: int = 3, days_ahead: int = 2, refrescar: bool = False
) -> None:
    print("Sincronizando resultados desde ESPN...")

    client = get_supabase_client()

    equipos = client.table("teams").select("id, abbreviation").execute().data
    abbr_por_equipo = {e["id"]: e["abbreviation"] for e in equipos}
    equipo_por_abbr = {e["abbreviation"]: e["id"] for e in equipos}

    ahora = datetime.now(timezone.utc)
    desde = ahora - timedelta(days=days_back)
    hasta = ahora + timedelta(days=days_ahead)
    print(f"   ventana: {desde.date()} a {hasta.date()}")

    nuestros = (
        client.table("games")
        .select(
            "id, starts_at, season, season_type, status, score_home, score_away, "
            "home_team_id, away_team_id, espn_event_id"
        )
        .gte("starts_at", desde.isoformat())
        .lte("starts_at", hasta.isoformat())
        .order("starts_at")
        .execute()
        .data
    )
    print(f"   {len(nuestros)} partidos nuestros en la ventana")
    if not nuestros:
        print("Sin partidos que actualizar.")
        return

    por_enfrentamiento: dict[str, list[dict]] = {}
    for g in nuestros:
        local = abbr_por_equipo.get(g["home_team_id"])
        visitante = abbr_por_equipo.get(g["away_team_id"])
        if not local or not visitante:
            continue
        por_enfrentamiento.setdefault(_clave(visitante, local), []).append(g)

    eventos: list[dict] = []
    dia = desde.date() - timedelta(days=1)
    while dia <= hasta.date():
        try:
            eventos.extend(get_scoreboard(dia))
        except Exception as e:
            print(f"   ESPN fallo el {dia}: {type(e).__name__}: {e}")
        dia += timedelta(days=1)
    print(f"   {len(eventos)} eventos leidos de ESPN")

    cambios: list[dict] = []
    cruzados: dict[str, dict] = {}

    for evento in eventos:
        candidatos = por_enfrentamiento.get(
            _clave(evento["away_abbr"], evento["home_abbr"])
        )
        if not candidatos:
            continue

        nuestro = None
        for g in candidatos:
            propia = _fecha(g["starts_at"])
            if propia and abs(propia - evento["starts_at"]) < MARGEN_CRUCE:
                nuestro = g
                break
        if not nuestro:
            continue

        cruzados[nuestro["id"]] = {**nuestro, "evento": evento}

        igual = (
            evento["status"] != "live"
            and nuestro["status"] == evento["status"]
            and (nuestro["score_home"] or 0) == evento["score_home"]
            and (nuestro["score_away"] or 0) == evento["score_away"]
            and nuestro.get("espn_event_id") == evento["espn_event_id"]
        )
        if igual:
            continue

        cambios.append(
            {
                "id": nuestro["id"],
                "starts_at": nuestro["starts_at"],
                "season": nuestro["season"],
                "season_type": nuestro["season_type"],
                "home_team_id": nuestro["home_team_id"],
                "away_team_id": nuestro["away_team_id"],
                "status": evento["status"],
                "score_home": evento["score_home"],
                "score_away": evento["score_away"],
                "period": evento["period"] or None,
                "time_remaining": evento["clock"] if evento["status"] == "live" else None,
                "espn_event_id": evento["espn_event_id"],
            }
        )

    print(f"   {len(cruzados)} partidos cruzados, {len(cambios)} con cambios")
    for c in cambios:
        print(f"      {c['id']}  {c['status']:>9}  {c['score_away']}-{c['score_home']}")

    if cambios:
        client.table("games").upsert(cambios).execute()

    finales = [
        d
        for d in cruzados.values()
        if d["evento"]["status"] == "final" and d["evento"]["espn_event_id"]
    ]
    if not finales:
        print("\nSin partidos finalizados que detallar.")
        return

    ids = [d["id"] for d in finales]
    con_log = {
        f["game_id"]
        for f in client.table("player_game_log")
        .select("game_id")
        .in_("game_id", ids)
        .execute()
        .data
    }
    con_titulares = {
        f["game_id"]
        for f in client.table("game_starters")
        .select("game_id")
        .in_("game_id", ids)
        .execute()
        .data
    }

    if refrescar:
        pendientes = finales
    else:
        pendientes = [
            d
            for d in finales
            if d["id"] not in con_log or d["id"] not in con_titulares
        ]
    if not pendientes:
        print(f"\n{len(finales)} partidos finalizados, todos con detalle.")
        return

    if refrescar:
        print(f"\n{len(pendientes)} partidos finalizados, releyendo por correcciones")
    else:
        print(f"\n{len(pendientes)} partidos finalizados sin detalle")

    jugadores = _paginado(client, "players", "id, first_name, last_name, team_id", "id")
    por_nombre: dict[str, list[dict]] = {}
    for p in jugadores:
        clave = normalizar_nombre(f"{p['first_name']} {p['last_name']}")
        por_nombre.setdefault(clave, []).append(p)

    total_log = 0
    total_titulares = 0
    sin_cruzar: list[str] = []

    for d in pendientes:
        evento = d["evento"]
        try:
            plantilla = get_box_score(evento["espn_event_id"])
        except Exception as e:
            print(f"   {d['id']}: ESPN fallo ({type(e).__name__}: {e})")
            continue

        if not plantilla:
            print(f"   {d['id']}: ESPN no dio box score")
            continue

        filas_log: list[dict] = []
        filas_titulares: list[dict] = []

        for j in plantilla:
            team_id = equipo_por_abbr.get(j["team_abbr"])
            candidatos = por_nombre.get(j["nombre_normalizado"]) or []

            if len(candidatos) == 1:
                elegido = candidatos[0]
            else:
                mismos = [c for c in candidatos if c["team_id"] == team_id]
                elegido = mismos[0] if len(mismos) == 1 else None

            if not elegido:
                sin_cruzar.append(f"{j['nombre']} ({j['team_abbr']})")
                continue

            filas_log.append(
                {
                    "player_id": elegido["id"],
                    "game_id": d["id"],
                    "season": d["season"],
                    "game_date": d["starts_at"],
                    **{campo: j[campo] for campo in CAMPOS_LOG},
                }
            )

            if j["starter"] and team_id:
                filas_titulares.append(
                    {
                        "game_id": d["id"],
                        "team_id": team_id,
                        "player_id": elegido["id"],
                        "spot": j["spot"],
                        "position": j["position"],
                    }
                )

        if filas_log and (refrescar or d["id"] not in con_log):
            client.table("player_game_log").upsert(filas_log).execute()
            total_log += len(filas_log)

        if filas_titulares and d["id"] not in con_titulares:
            client.table("game_starters").upsert(filas_titulares).execute()
            total_titulares += len(filas_titulares)

        print(
            f"   {d['id']}: {len(filas_log)} jugadores, "
            f"{len(filas_titulares)} titulares"
        )

    print(f"\n{total_log} lineas de box score y {total_titulares} titulares guardados")
    if sin_cruzar:
        unicos = sorted(set(sin_cruzar))
        print(f"   {len(unicos)} jugadores sin cruzar: {', '.join(unicos[:10])}")


if __name__ == "__main__":
    import sys

    def _arg(flag: str, default: int) -> int:
        return int(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default

    sync_espn_results(
        days_back=_arg("--days-back", 3),
        days_ahead=_arg("--days-ahead", 2),
        refrescar="--refresh" in sys.argv,
    )
