-- ============================================
-- Ronda de playoffs en team_games
-- ============================================
-- El identificador de partido de la NBA codifica la ronda solo desde
-- 2001-02. De 1984-85 a 2000-01 es un correlativo y no dice nada, asi que
-- la ronda se deduce de la estructura del cuadro: las series se ordenan
-- por su primer partido y el cuadro de 16 equipos siempre reparte
-- 8 + 4 + 2 + 1.
--
-- El metodo se contrasto contra las 24 temporadas que si llevan la ronda
-- en el ID: coincide en 2168 de 2170 partidos, y las dos excepciones son
-- de 1985-86, donde el digito comparado formaba parte del correlativo y
-- no era una ronda de verdad.
--
-- El desempate por par de equipos en el row_number no es cosmetico: las
-- ocho series de primera ronda empiezan casi todas el mismo dia, y sin el
-- se repartirian rangos empatados y las rondas saldrian mal.

drop function if exists team_games(text, text);

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
  playoff_round int,
  title_decider boolean
)
language sql
stable
as $$
  with playoffs as (
    select
      g.id,
      g.starts_at,
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
  series_orden as (
    select
      team_low,
      team_high,
      row_number() over (order by min(starts_at), team_low, team_high) as orden
    from playoffs
    group by team_low, team_high
  ),
  series_ronda as (
    select
      team_low,
      team_high,
      case
        when orden <= 8 then 1
        when orden <= 12 then 2
        when orden <= 14 then 3
        else 4
      end as ronda
    from series_orden
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
    sr.ronda::int as playoff_round,
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
  left join series_ronda sr
    on sr.team_low = least(g.home_team_id, g.away_team_id)
   and sr.team_high = greatest(g.home_team_id, g.away_team_id)
   and g.season_type = 'playoffs'
  left join ultimo u on true
  left join campeon c on true
  where g.season = target_season
    and (g.home_team_id = target_team_id or g.away_team_id = target_team_id)
  order by g.starts_at;
$$;

grant execute on function team_games(text, text) to anon;
grant execute on function team_games(text, text) to authenticated;
