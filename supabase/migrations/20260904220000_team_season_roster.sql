-- ============================================
-- Plantilla de un equipo en una temporada concreta
-- ============================================
-- La pantalla de equipo solo sabia de la plantilla actual. Con 42
-- temporadas de player_season_teams se puede reconstruir cualquier
-- plantilla historica con las medias de aquel año.
--
-- Las estadisticas salen del desglose por equipo cuando existe, y si no
-- caen a las medias de temporada, que para quien no fue traspasado son
-- las mismas.

create or replace function team_season_roster(
  target_team_id text,
  target_season text
)
returns table (
  player_id text,
  first_name text,
  last_name text,
  photo_url text,
  jersey_number text,
  player_position text,
  games_played int,
  minutes numeric,
  points numeric,
  rebounds numeric,
  assists numeric,
  steals numeric,
  blocks numeric,
  field_goal_pct numeric,
  three_point_pct numeric,
  free_throw_pct numeric,
  won_championship boolean
)
language sql
stable
as $$
  select
    p.id as player_id,
    p.first_name,
    p.last_name,
    p.photo_url,
    pst.jersey_number,
    pst.position as player_position,
    coalesce(pst.games_played, psh.games_played) as games_played,
    coalesce(pst.minutes, psh.minutes) as minutes,
    coalesce(pst.points, psh.points) as points,
    coalesce(pst.rebounds, psh.rebounds) as rebounds,
    coalesce(pst.assists, psh.assists) as assists,
    coalesce(pst.steals, psh.steals) as steals,
    coalesce(pst.blocks, psh.blocks) as blocks,
    coalesce(pst.field_goal_pct, psh.field_goal_pct) as field_goal_pct,
    coalesce(pst.three_point_pct, psh.three_point_pct) as three_point_pct,
    coalesce(pst.free_throw_pct, psh.free_throw_pct) as free_throw_pct,
    coalesce(sc.team_id = pst.team_id, false) as won_championship
  from player_season_teams pst
  join players p on p.id = pst.player_id
  left join player_season_history psh
    on psh.player_id = pst.player_id
   and psh.season = pst.season
  left join season_champions sc
    on sc.season = pst.season
  where pst.team_id = target_team_id
    and pst.season = target_season
  -- Los que mas anotaron primero: es como se lee una plantilla historica
  order by coalesce(pst.points, psh.points, 0) desc, p.last_name;
$$;

grant execute on function team_season_roster(text, text) to anon;
grant execute on function team_season_roster(text, text) to authenticated;
