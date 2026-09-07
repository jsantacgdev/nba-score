-- ============================================
-- La final de la NBA Cup no cuenta para la clasificacion
-- ============================================
-- El prefijo del identificador codifica el tipo de partido, y la final de
-- la Copa tiene el suyo propio: 006. No estaba en el mapa, asi que caia en
-- el valor por defecto y se contaba como liga regular. Efecto visible: en
-- 2023-24 los Lakers y los Pacers aparecian con 83 partidos, cuando la
-- clasificacion oficial da 82 a los treinta equipos.
--
-- El partido se conserva, porque se jugo y sus estadisticas cuentan; lo
-- unico que cambia es que deja de sumar en la clasificacion. Las funciones
-- de clasificacion filtran por 'regular', asi que salen solas, y
-- team_games no filtra por tipo, asi que sigue apareciendo en la lista de
-- partidos del equipo.
--
-- Hoy solo hay una fila afectada: la final de 2023-24, Lakers 123 - 109
-- Pacers del 9 de diciembre de 2023, la primera que se jugo.

alter table games drop constraint if exists games_season_type_check;

alter table games add constraint games_season_type_check
  check (season_type in ('preseason', 'regular', 'allstar', 'playoffs', 'playin', 'cup_final'));

update games
set season_type = 'cup_final'
where id like '006%'
  and season_type <> 'cup_final';
