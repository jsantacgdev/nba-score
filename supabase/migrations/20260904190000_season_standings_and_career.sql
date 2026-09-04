-- ============================================
-- Clasificacion por temporada y carrera del jugador
-- ============================================
-- La vista league_standings solo sabe de la temporada en curso. Para poder
-- consultar cualquier temporada hace falta un parametro, y las vistas no
-- los aceptan, asi que van como funciones (igual que search_players).

-- Temporadas que tienen clasificacion disponible, de mas nueva a mas vieja.
-- Sale de los partidos reales, asi que el selector de la app crece solo
-- segun se vayan cargando temporadas.
create or replace function standings_seasons()
returns table (season text, games_count int)
language sql
stable
as $$
  select
    g.season,
    count(*)::int as games_count
  from games g
  where g.status = 'final'
    and g.season_type = 'regular'
  group by g.season
  order by g.season desc;
$$;

-- Clasificacion completa de una temporada, con el campeon marcado.
create or replace function season_standings(target_season text)
returns table (
  team_id text,
  name text,
  full_name text,
  abbreviation text,
  city text,
  conference text,
  division text,
  logo_url text,
  wins int,
  losses int,
  games_played int,
  win_percentage numeric,
  point_differential numeric,
  won_championship boolean
)
language sql
stable
as $$
  with team_results as (
    select
      home_team_id as team_id,
      case when score_home > score_away then 1 else 0 end as win,
      case when score_home < score_away then 1 else 0 end as loss,
      score_home as points_for,
      score_away as points_against
    from games
    where status = 'final'
      and season_type = 'regular'
      and season = target_season

    union all

    select
      away_team_id as team_id,
      case when score_away > score_home then 1 else 0 end as win,
      case when score_away < score_home then 1 else 0 end as loss,
      score_away as points_for,
      score_home as points_against
    from games
    where status = 'final'
      and season_type = 'regular'
      and season = target_season
  )
  select
    t.id as team_id,
    t.name,
    t.full_name,
    t.abbreviation,
    t.city,
    t.conference,
    t.division,
    t.logo_url,
    sum(r.win)::int as wins,
    sum(r.loss)::int as losses,
    count(*)::int as games_played,
    round(sum(r.win)::numeric / count(*), 3) as win_percentage,
    round((sum(r.points_for) - sum(r.points_against))::numeric / count(*), 1)
      as point_differential,
    coalesce(c.team_id = t.id, false) as won_championship
  from teams t
  -- join normal, no left: un equipo que no jugo esa temporada no debe
  -- aparecer en su clasificacion con un 0-0
  join team_results r on r.team_id = t.id
  left join season_champions c on c.season = target_season
  group by
    t.id, t.name, t.full_name, t.abbreviation, t.city,
    t.conference, t.division, t.logo_url, c.team_id
  order by win_percentage desc, wins desc;
$$;

-- Carrera de un jugador: una fila por temporada y equipo, con las medias
-- de esa etapa concreta y el anillo marcado en el equipo donde lo gano.
create or replace function player_career(target_player_id text)
returns table (
  season text,
  team_id text,
  team_name text,
  team_abbreviation text,
  team_logo_url text,
  games_played int,
  minutes numeric,
  points numeric,
  rebounds numeric,
  assists numeric,
  steals numeric,
  blocks numeric,
  turnovers numeric,
  field_goal_pct numeric,
  three_point_pct numeric,
  free_throw_pct numeric,
  team_count int,
  won_championship boolean
)
language sql
stable
as $$
  select
    pst.season,
    pst.team_id,
    t.name as team_name,
    t.abbreviation as team_abbreviation,
    t.logo_url as team_logo_url,
    -- Si el desglose por equipo aun no esta cargado, caemos a las medias
    -- de temporada, que para quien no fue traspasado son las mismas.
    coalesce(pst.games_played, psh.games_played) as games_played,
    coalesce(pst.minutes, psh.minutes) as minutes,
    coalesce(pst.points, psh.points) as points,
    coalesce(pst.rebounds, psh.rebounds) as rebounds,
    coalesce(pst.assists, psh.assists) as assists,
    coalesce(pst.steals, psh.steals) as steals,
    coalesce(pst.blocks, psh.blocks) as blocks,
    coalesce(pst.turnovers, psh.turnovers) as turnovers,
    coalesce(pst.field_goal_pct, psh.field_goal_pct) as field_goal_pct,
    coalesce(pst.three_point_pct, psh.three_point_pct) as three_point_pct,
    coalesce(pst.free_throw_pct, psh.free_throw_pct) as free_throw_pct,
    coalesce(psh.team_count, 1) as team_count,
    coalesce(psh.won_championship and sc.team_id = pst.team_id, false)
      as won_championship
  from player_season_teams pst
  join teams t on t.id = pst.team_id
  left join player_season_history psh
    on psh.player_id = pst.player_id
   and psh.season = pst.season
  left join season_champions sc
    on sc.season = pst.season
  where pst.player_id = target_player_id
  order by pst.season desc, coalesce(pst.games_played, psh.games_played, 0) desc;
$$;

grant execute on function standings_seasons() to anon;
grant execute on function standings_seasons() to authenticated;
grant execute on function season_standings(text) to anon;
grant execute on function season_standings(text) to authenticated;
grant execute on function player_career(text) to anon;
grant execute on function player_career(text) to authenticated;
