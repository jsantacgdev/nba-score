-- ============================================
-- Estadisticas por equipo dentro de una misma temporada
-- ============================================
-- player_season_history guarda las medias que publica la NBA, que son de
-- temporada completa: un jugador traspasado tiene una sola fila con los
-- promedios de sus dos etapas mezcladas.
--
-- Estas columnas guardan el desglose real por equipo, sacado de
-- PlayerCareerStats, que si separa las etapas. Se quedan a null mientras
-- no se hayan rellenado, para poder distinguir "sin cargar" de "cero".

alter table player_season_teams add column games_played int;
alter table player_season_teams add column minutes numeric(4,1);
alter table player_season_teams add column points numeric(4,1);
alter table player_season_teams add column rebounds numeric(4,1);
alter table player_season_teams add column assists numeric(4,1);
alter table player_season_teams add column steals numeric(4,1);
alter table player_season_teams add column blocks numeric(4,1);
alter table player_season_teams add column turnovers numeric(4,1);
alter table player_season_teams add column field_goal_pct numeric(4,3);
alter table player_season_teams add column three_point_pct numeric(4,3);
alter table player_season_teams add column free_throw_pct numeric(4,3);
