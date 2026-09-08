"""
Carga las lesiones vigentes desde ESPN.

El feed solo devuelve lo que hay ahora mismo, asi que este job construye el
historico por acumulacion: cada pasada refresca last_seen_at de lo que
sigue apareciendo y apaga is_current en lo que ya no aparece, que es la
forma de saber, aproximadamente, cuando se dio de alta un jugador.
"""

from datetime import datetime, timezone

from src.clients.espn import get_injuries, normalizar_nombre
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 200


def sync_injuries() -> None:
    print("Sincronizando lesiones...")

    lesiones = get_injuries()
    if not lesiones:
        print("El feed no devolvio lesiones.")
        return

    print(f"   {len(lesiones)} lesiones en el feed")

    client = get_supabase_client()

    # Indice de jugadores por nombre normalizado
    por_nombre: dict[str, list[dict]] = {}
    offset = 0
    while True:
        r = (
            client.table("players")
            .select("id, first_name, last_name, team_id")
            .order("id")
            .range(offset, offset + 999)
            .execute()
        )
        if not r.data:
            break
        for p in r.data:
            clave = normalizar_nombre(f"{p['first_name']} {p['last_name']}")
            por_nombre.setdefault(clave, []).append(p)
        if len(r.data) < 1000:
            break
        offset += 1000

    equipos = {
        t["full_name"]: t["id"]
        for t in client.table("teams").select("id, full_name").execute().data
    }

    ahora = datetime.now(timezone.utc).isoformat()

    filas = []
    sin_casar: list[str] = []
    ambiguos: list[str] = []
    for lesion in lesiones:
        candidatos = por_nombre.get(lesion["nombre_normalizado"], [])
        if len(candidatos) == 1:
            jugador = candidatos[0]
        elif len(candidatos) > 1:
            # Se desempata por equipo; si tampoco basta, se guarda sin ficha
            equipo_id = equipos.get(lesion["nombre_equipo"])
            mismos = [c for c in candidatos if c.get("team_id") == equipo_id]
            jugador = mismos[0] if len(mismos) == 1 else None
            if jugador is None:
                ambiguos.append(lesion["player_name"])
        else:
            jugador = None
            sin_casar.append(lesion["player_name"])

        filas.append(
            {
                "id": lesion["id"],
                "player_id": jugador["id"] if jugador else None,
                "espn_athlete_id": lesion["espn_athlete_id"],
                "player_name": lesion["player_name"],
                "team_id": equipos.get(lesion["nombre_equipo"])
                or (jugador.get("team_id") if jugador else None),
                "status": lesion["status"],
                "injury_type": lesion["injury_type"],
                "side": lesion["side"],
                "return_date": lesion["return_date"],
                "short_comment": lesion["short_comment"],
                "long_comment": lesion["long_comment"],
                "reported_at": lesion["reported_at"],
                "last_seen_at": ahora,
                "is_current": True,
            }
        )

    casados = sum(1 for f in filas if f["player_id"])
    print(f"   {casados} cruzan con un jugador de la app")
    if sin_casar:
        print(f"   {len(sin_casar)} sin casar: {sin_casar[:6]}")
    if ambiguos:
        print(f"   {len(ambiguos)} con nombre repetido: {ambiguos[:6]}")

    # Lo que ya no aparece en el feed deja de estar vigente. Se hace antes
    # del upsert para no apagar lo que acabamos de traer.
    vigentes = {f["id"] for f in filas}
    anteriores = client.table("player_injuries").select("id").eq("is_current", True).execute().data
    resueltas = [x["id"] for x in (anteriores or []) if x["id"] not in vigentes]
    for i in range(0, len(resueltas), BATCH_SIZE):
        client.table("player_injuries").update({"is_current": False}).in_(
            "id", resueltas[i : i + BATCH_SIZE]
        ).execute()

    total = 0
    for i in range(0, len(filas), BATCH_SIZE):
        result = client.table("player_injuries").upsert(filas[i : i + BATCH_SIZE]).execute()
        total += len(result.data)

    print(f"\n✅ {total} lesiones guardadas")
    if resueltas:
        print(f"   {len(resueltas)} ya no aparecen en el feed: marcadas como resueltas")


if __name__ == "__main__":
    sync_injuries()
