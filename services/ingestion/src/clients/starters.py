"""
Quinteto inicial de un partido.

Una llamada por partido al box score de la NBA. Se usa BoxScoreTraditionalV3
y no la CDN por dos motivos: la CDN solo cubre de 2019-20 en adelante y
corta las rafagas, mientras que la V3 responde para todo el historico.

Como se identifica a los titulares
----------------------------------
La V3 rellena el campo 'position' solo a los cinco titulares... pero solo
desde 2019-20. En partidos anteriores lo rellena a todos los que jugaron y
lo deja vacio unicamente en los que no jugaron, asi que ahi no distingue
nada. Tampoco lo arregla la V2 antigua: es el dato historico de la NBA el
que viene asi.

Lo que si vale en todas las epocas es el orden: el box score lista primero
a los cinco titulares y despues al banquillo. Se comprobo contra la CDN,
que marca titulares con un campo explicito, en 24 equipos de 24 repartidos
por cuatro temporadas.

De modo que se usa el campo cuando marca exactamente cinco, que es la
lectura mas segura, y se cae al orden cuando no.
"""

from nba_api.stats.endpoints import boxscoretraditionalv3


def _id(value) -> str:
    """Los identificadores llegan como float: 1610612739.0."""
    try:
        return str(int(float(value)))
    except (TypeError, ValueError):
        return str(value).strip()


def get_game_starters(game_id: str) -> list[dict]:
    """
    Devuelve cinco filas por equipo, en el orden en que la NBA las lista.

    Lista vacia si el partido no tiene box score, que le pasa a la
    pretemporada antigua y a algun partido suelto.
    """
    box = boxscoretraditionalv3.BoxScoreTraditionalV3(game_id=game_id, timeout=45)
    df = box.player_stats.get_data_frame()
    if df.empty:
        return []

    titulares = []
    for team_id in df["teamId"].unique():
        equipo = df[df["teamId"] == team_id].reset_index(drop=True)

        con_posicion = equipo[equipo["position"].astype(str).str.strip() != ""]

        # Cinco marcados es el dato explicito; cualquier otra cosa
        # significa que esa temporada rellena la posicion a todos
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
