-- ============================================
-- Rellenar la temporada en player_game_log
-- ============================================
-- sync_box_scores guarda las lineas de box score a partir del endpoint de
-- la NBA, que no devuelve la temporada, asi que 2577 filas quedaron con
-- season a null: los playoffs y el play-in de 2025-26.
--
-- No se noto hasta ahora porque nadie filtraba por temporada. En cuanto
-- la ficha del jugador lo haga, esas filas desapareceran de su historial.
-- El dato es recuperable: lo tiene el partido.

update player_game_log l
set season = g.season
from games g
where g.id = l.game_id
  and l.season is null;
