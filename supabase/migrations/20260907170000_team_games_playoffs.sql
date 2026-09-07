-- ============================================
-- Partidos de un equipo, con contexto de playoffs
-- ============================================
-- La pantalla de equipo consultaba la tabla directamente. Pasa a funcion
-- para poder calcular dos cosas que no se pueden sacar mirando un partido
-- aislado:
--
--   1. El balance de la eliminatoria en ese momento (1-0, 2-1, 4-3...).
--      Se acumula con una funcion de ventana sobre los partidos previos
--      de esa misma serie.
--
--   2. Si ese partido decidio el titulo, para poder poner el trofeo al
--      lado del ganador.

create or replace function team_games(
  target_team_id text,
  target_season text
)
returns table (
  id text,
  starts_at timestamptz,
  status text,
  season_type text,
  score_home int,
  score_away int,
  period int,
  time_remaining text,
  home_team_id text,
  home_name text,
  home_abbreviation text,
  home_logo_url text,
  away_team_id text,
  away_name text,
  away_abbreviation text,
  away_logo_url text,
  series_wins_home int,
  series_wins_away int,
  title_decider boolean
)
language sql
stable
as $$
  with playoffs as (
    select
      g.id,
      g.starts_at,
      -- La serie se identifica por el par de equipos, sin importar quien
      -- juega en casa: ordenamos los dos ids para tener una clave estable.
      least(g.home_team_id, g.away_team_id) as team_low,
      greatest(g.home_team_id, g.away_team_id) as team_high,
      case
        when g.score_home > g.score_away then g.home_team_id
        else g.away_team_id
      end as winner
    from games g
    where g.season = target_season
      and g.season_type = 'playoffs'
      and g.status = 'final'
  ),
  series as (
    select
      p.id,
      p.team_low,
      p.team_high,
      count(*) filter (where p.winner = p.team_low) over w as wins_low,
      count(*) filter (where p.winner = p.team_high) over w as wins_high
    from playoffs p
    window w as (
      partition by p.team_low, p.team_high
      order by p.starts_at
      rows between unbounded preceding and current row
    )
  ),
  ultimo as (
    select max(starts_at) as fin from playoffs
  ),
  campeon as (
    select team_id
    from season_champions
    where season = target_season
      and competition = 'nba'
  )
  select
    g.id,
    g.starts_at,
    g.status,
    g.season_type,
    g.score_home,
    g.score_away,
    g.period,
    g.time_remaining,
    g.home_team_id,
    h.name as home_name,
    h.abbreviation as home_abbreviation,
    h.logo_url as home_logo_url,
    g.away_team_id,
    a.name as away_name,
    a.abbreviation as away_abbreviation,
    a.logo_url as away_logo_url,
    case
      when s.id is null then null
      when g.home_team_id = s.team_low then s.wins_low::int
      else s.wins_high::int
    end as series_wins_home,
    case
      when s.id is null then null
      when g.away_team_id = s.team_low then s.wins_low::int
      else s.wins_high::int
    end as series_wins_away,
    -- Solo el ultimo partido de playoffs de una temporada ya cerrada, y
    -- solo si lo gano quien consta como campeon.
    coalesce(
      g.season_type = 'playoffs'
      and g.starts_at = u.fin
      and c.team_id = case
        when g.score_home > g.score_away then g.home_team_id
        else g.away_team_id
      end,
      false
    ) as title_decider
  from games g
  join teams h on h.id = g.home_team_id
  join teams a on a.id = g.away_team_id
  left join series s on s.id = g.id
  left join ultimo u on true
  left join campeon c on true
  where g.season = target_season
    and (g.home_team_id = target_team_id or g.away_team_id = target_team_id)
  order by g.starts_at;
$$;

grant execute on function team_games(text, text) to anon;
grant execute on function team_games(text, text) to authenticated;
