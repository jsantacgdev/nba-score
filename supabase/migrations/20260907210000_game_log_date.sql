-- ============================================
-- Rellenar la fecha en player_game_log
-- ============================================
-- Mismo caso que la temporada: el endpoint de box score de la NBA no
-- devuelve la fecha del partido, asi que sync_box_scores guardaba
-- game_date a null.
--
-- Se notaba al ordenar el historial de un jugador: la app pide
-- "order by game_date desc" y en PostgreSQL los nulos van primero en
-- orden descendente, asi que las filas salian en el orden que quisiera el
-- planificador. La fecha visible venia del partido, de ahi que se vieran
-- bien las fechas pero mal el orden.

update player_game_log l
set game_date = g.starts_at
from games g
where g.id = l.game_id
  and l.game_date is null;
