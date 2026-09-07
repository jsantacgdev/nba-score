-- ============================================
-- Clasificacion de la temporada aun sin empezar
-- ============================================
-- El selector solo ofrecia temporadas con partidos jugados, asi que la
-- que esta por empezar no aparecia pese a tener el calendario cargado.
--
-- Ahora una temporada entra en la lista si tiene partidos de temporada
-- regular, jugados o no, y su clasificacion sale con los 30 equipos a
-- 0-0 hasta que empiece a rodar.

drop function if exists standings_seasons();

create or replace function standings_seasons()
returns table (
  season text,
  games_count int,
  champion_team_id text,
  champion_name text,
  champion_abbreviation text,
  champion_logo_url text
)
language sql
stable
as $$
  with temporadas as (
    select
      g.season,
      -- Solo cuenta lo jugado: es lo que da sentido a la tabla
      count(*) filter (where g.status = 'final')::int as games_count
    from games g
    where g.season_type = 'regular'
    group by g.season
  )
  select
    s.season,
    s.games_count,
    c.team_id as champion_team_id,
    t.name as champion_name,
    t.abbreviation as champion_abbreviation,
    t.logo_url as champion_logo_url
  from temporadas s
  left join season_champions c
    on c.season = s.season
   and c.competition = 'nba'
  left join teams t on t.id = c.team_id
  order by s.season desc;
$$;

-- ============================================
-- season_standings: el universo de equipos sale del calendario
-- ============================================
-- Antes los equipos salian de los resultados, asi que sin partidos
-- jugados no habia tabla. Ahora salen de quien tiene partidos esa
-- temporada, jugados o programados, y los balances se cruzan encima.
--
-- Sigue sin ser un left join sobre los 30 equipos actuales: en 1990 no
-- existian los Grizzlies y no deben aparecer en su clasificacion.

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
  with participantes as (
    select distinct home_team_id as team_id
    from games
    where season = target_season and season_type = 'regular'
    union
    select distinct away_team_id
    from games
    where season = target_season and season_type = 'regular'
  ),
  team_results as (
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
    coalesce(sum(r.win), 0)::int as wins,
    coalesce(sum(r.loss), 0)::int as losses,
    -- count(r.team_id) y no count(*): sin partidos el left join deja una
    -- fila con nulos que count(*) contaria como uno
    count(r.team_id)::int as games_played,
    case
      when count(r.team_id) > 0
        then round(sum(r.win)::numeric / count(r.team_id), 3)
      else 0
    end as win_percentage,
    case
      when count(r.team_id) > 0
        then round(
          (sum(r.points_for) - sum(r.points_against))::numeric / count(r.team_id), 1
        )
      else 0
    end as point_differential,
    coalesce(c.team_id = t.id, false) as won_championship
  from teams t
  join participantes p on p.team_id = t.id
  left join team_results r on r.team_id = t.id
  left join campeon c on true
  group by
    t.id, t.name, t.full_name, t.abbreviation, t.city,
    t.conference, t.division, t.logo_url, c.team_id
  -- El nombre desempata: sin partidos jugados todo va a cero y sin esto
  -- el orden cambiaria en cada consulta
  order by win_percentage desc, wins desc, t.name;
$$;

grant execute on function standings_seasons() to anon;
grant execute on function standings_seasons() to authenticated;
grant execute on function season_standings(text) to anon;
grant execute on function season_standings(text) to authenticated;
