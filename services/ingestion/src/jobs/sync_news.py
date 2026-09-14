"""
Carga las noticias de la NBA desde ESPN Deportes.

Vienen ya en castellano, redactadas por sus periodistas, asi que no hay
nada que traducir. Los videos se descartan en el cliente.

Lo que si hace este job es cruzar las etiquetas: ESPN dice de que equipos y
jugadores habla cada noticia, pero con sus propios nombres. Aqui se
resuelven a nuestros identificadores para poder enseñar la noticia en la
ficha correspondiente.
"""

from src.clients.espn import get_news, normalizar_nombre
from src.clients.supabase import get_supabase_client

BATCH_SIZE = 100

# ESPN los nombra asi y nosotros de otra forma
ALIAS_EQUIPOS = {
    "la clippers": "los angeles clippers",
    "l a clippers": "los angeles clippers",
}


def sync_news(limite: int = 50) -> None:
    print("Sincronizando noticias...")
    client = get_supabase_client()

    noticias = get_news(limite)
    if not noticias:
        print("El feed no devolvio noticias.")
        return
    print(f"   {len(noticias)} noticias en el feed")

    equipos = {
        normalizar_nombre(t["full_name"]): t["id"]
        for t in client.table("teams").select("id, full_name").execute().data
    }

    jugadores: dict[str, list[str]] = {}
    offset = 0
    while True:
        pagina = (
            client.table("players")
            .select("id, first_name, last_name")
            .order("id")
            .range(offset, offset + 999)
            .execute()
        )
        if not pagina.data:
            break
        for p in pagina.data:
            clave = normalizar_nombre(f"{p['first_name']} {p['last_name']}")
            jugadores.setdefault(clave, []).append(p["id"])
        if len(pagina.data) < 1000:
            break
        offset += 1000

    filas = []
    equipos_sin_cruzar: set[str] = set()
    jugadores_sin_cruzar: set[str] = set()

    for n in noticias:
        ids_equipos = []
        for nombre in n["team_names"]:
            clave = normalizar_nombre(nombre)
            clave = ALIAS_EQUIPOS.get(clave, clave)
            encontrado = equipos.get(clave)
            if encontrado:
                ids_equipos.append(encontrado)
            else:
                equipos_sin_cruzar.add(nombre)

        ids_jugadores = []
        for nombre in n["player_names"]:
            candidatos = jugadores.get(normalizar_nombre(nombre), [])
            # Un nombre repetido se descarta: mejor sin etiqueta que
            # colgarle la noticia al jugador equivocado
            if len(candidatos) == 1:
                ids_jugadores.append(candidatos[0])
            else:
                jugadores_sin_cruzar.add(nombre)

        filas.append(
            {
                "id": n["id"],
                "headline": n["headline"],
                "description": n["description"],
                "link": n["link"],
                "image_url": n["image_url"],
                "published": n["published"],
                "team_ids": sorted(set(ids_equipos)),
                "player_ids": sorted(set(ids_jugadores)),
            }
        )

    con_equipo = sum(1 for f in filas if f["team_ids"])
    con_jugador = sum(1 for f in filas if f["player_ids"])
    print(f"   {con_equipo} etiquetadas con algun equipo")
    print(f"   {con_jugador} etiquetadas con algun jugador")
    if equipos_sin_cruzar:
        print(f"   equipos sin cruzar: {sorted(equipos_sin_cruzar)[:5]}")
    if jugadores_sin_cruzar:
        print(f"   {len(jugadores_sin_cruzar)} jugadores sin cruzar")

    total = 0
    for i in range(0, len(filas), BATCH_SIZE):
        resultado = client.table("news_articles").upsert(filas[i : i + BATCH_SIZE]).execute()
        total += len(resultado.data)

    print(f"\n✅ {total} noticias guardadas")


if __name__ == "__main__":
    sync_news()
