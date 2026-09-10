
from nba_api.stats.endpoints import boxscoretraditionalv3

def _id(value) -> str:
    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        return str(value).strip()

def get_game_starters(game_id: str) -> list[dict]:
    box = boxscoretraditionalv3.BoxScoreTraditionalV3(game_id=game_id, timeout=45)
    df = box.player_stats.get_data_frame()
    if df.empty:
        return []

    titulares = []
    for team_id in df["teamId"].unique():
        equipo = df[df["teamId"] == team_id].reset_index(drop=True)

        con_posicion = equipo[equipo["position"].astype(str).str.strip() != ""]

        cinco = con_posicion if len(con_posicion) == 5 else equipo.head(5)

        for spot, (_, fila) in enumerate(cinco.iterrows()):
            titulares.append(
                {
                    "game_id": str(game_id),
                    "team_id": _id(team_id),
                    "player_id": _id(fila["personId"]),
                    "spot": spot,
                    "position": (str(fila.get("position") or "").strip() or None),
                }
            )

    return titulares
