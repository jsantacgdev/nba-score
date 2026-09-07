-- ============================================
-- Arreglo: season_standings duplicaba los balances
-- ============================================
-- Al aceptar season_champions dos filas por temporada (NBA y NBA Cup),
-- el left join de esta funcion empezo a devolver dos filas por cada
-- resultado de equipo, asi que las sumas salian dobladas: Detroit
-- aparecia con 118-44 en vez de 59-22 en la temporada 2025-26.
--
-- Las otras funciones que cruzan con la tabla (team_seasons,
-- team_season_roster y player_career) ya se acotaron a 'nba' al añadir la
-- Copa; esta se quedo atras.

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
  ),
  -- Una sola fila por temporada: sin esto el join multiplica los balances
  campeon as (
    select team_id
    from season_champions
    where season = target_season
      and competition = 'nba'
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
  join team_results r on r.team_id = t.id
  left join campeon c on true
  group by
    t.id, t.name, t.full_name, t.abbreviation, t.city,
    t.conference, t.division, t.logo_url, c.team_id
  order by win_percentage desc, wins desc;
$$;

grant execute on function season_standings(text) to anon;
grant execute on function season_standings(text) to authenticated;
