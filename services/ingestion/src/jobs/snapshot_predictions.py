from src.clients.supabase import get_supabase_client

HORAS = 36


def snapshot_predictions() -> None:
    print("Fichando pronosticos de los proximos partidos...")

    client = get_supabase_client()

    result = client.rpc("snapshot_game_predictions", {"horas": HORAS}).execute()
    nuevos = result.data or 0

    print(f"\n✅ {nuevos} pronosticos guardados (partidos en las proximas {HORAS} h)")

    balance = client.rpc("model_record").execute()
    for fila in balance.data or []:
        resueltos = fila["resueltos"]
        if resueltos == 0:
            print(f"   {fila['season']}: {fila['pendientes']} por jugar")
            continue
        print(
            f"   {fila['season']}: {fila['aciertos']}/{resueltos} aciertos "
            f"({100 * float(fila['acierto']):.1f}%), {fila['pendientes']} por jugar"
        )


if __name__ == "__main__":
    snapshot_predictions()
