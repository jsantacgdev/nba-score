create or replace function game_team_form(target_game_id text)
returns table (
  team_id text,
  side text,
  season text,
  previous_season boolean,
  wins int,
  losses int,
  conference_rank int,
  points_for numeric,
  points_against numeric,
  home_wins int,
  home_losses int,
  away_wins int,
  away_losses int,
  streak int,
  last_results text[]
)
language sql
stable
as $$
  with partido as (
    select g.id, g.season, g.starts_at, g.home_team_id, g.away_team_id
    from games g
    where g.id = target_game_id
  ),
  jugados as (
    select count(*) as n
    from games g, partido p
    where g.season = p.season
      and g.status = 'final'
      and g.season_type <> 'preseason'
      and g.starts_at < p.starts_at
  ),
  anterior as (
    select max(g.season) as season
    from games g, partido p
    where g.season < p.season
  ),
  ventana as (
    select
      case when j.n > 0 then p.season else a.season end as season,
      (j.n = 0) as previous_season,
      case when j.n > 0 then p.starts_at else 'infinity'::timestamptz end as hasta
    from partido p, jugados j, anterior a
  ),
  partidos as (
    select
      g.home_team_id, g.away_team_id,
      g.score_home, g.score_away,
      g.starts_at, g.season_type
    from games g, ventana v
    where g.season = v.season
      and g.status = 'final'
      and g.season_type <> 'preseason'
      and g.starts_at < v.hasta
  ),
  lineas as (
    select
      pa.home_team_id as team_id,
      true as en_casa,
      pa.score_home as anotados,
      pa.score_away as recibidos,
      pa.starts_at,
      pa.season_type
    from partidos pa
    union all
    select
      pa.away_team_id,
      false,
      pa.score_away,
      pa.score_home,
      pa.starts_at,
      pa.season_type
    from partidos pa
  ),
  balance as (
    select
      l.team_id,
      count(*) filter (where l.anotados > l.recibidos)::int as wins,
      count(*) filter (where l.anotados < l.recibidos)::int as losses,
      count(*)::int as jugados,
      avg(l.anotados) as points_for,
      avg(l.recibidos) as points_against,
      count(*) filter (where l.en_casa and l.anotados > l.recibidos)::int as home_wins,
      count(*) filter (where l.en_casa and l.anotados < l.recibidos)::int as home_losses,
      count(*) filter (where not l.en_casa and l.anotados > l.recibidos)::int as away_wins,
      count(*) filter (where not l.en_casa and l.anotados < l.recibidos)::int as away_losses
    from lineas l
    where l.season_type = 'regular'
    group by l.team_id
  ),
  clasificacion as (
    select
      b.team_id,
      rank() over (
        partition by t.conference
        order by
          b.wins::numeric / nullif(b.jugados, 0) desc nulls last,
          b.wins desc
      )::int as posicion
    from balance b
    join teams t on t.id = b.team_id
  ),
  ordenados as (
    select
      l.team_id,
      l.anotados > l.recibidos as gano,
      row_number() over (partition by l.team_id order by l.starts_at desc) as rn
    from lineas l
  ),
  ultimos as (
    select
      o.team_id,
      array_agg(case when o.gano then 'W' else 'L' end order by o.rn desc)
        filter (where o.rn <= 5) as last_results
    from ordenados o
    group by o.team_id
  ),
  racha as (
    select
      o.team_id,
      (
        select count(*)
        from ordenados o2
        where o2.team_id = o.team_id
          and o2.rn < coalesce(
            (
              select min(o3.rn)
              from ordenados o3
              where o3.team_id = o.team_id
                and o3.gano <> o.gano
            ),
            2147483647
          )
      )::int * case when o.gano then 1 else -1 end as streak
    from ordenados o
    where o.rn = 1
  ),
  lados as (
    select p.home_team_id as team_id, 'home'::text as side from partido p
    union all
    select p.away_team_id, 'away'::text from partido p
  )
  select
    x.team_id,
    x.side,
    v.season,
    v.previous_season,
    coalesce(b.wins, 0),
    coalesce(b.losses, 0),
    c.posicion,
    round(coalesce(b.points_for, 0), 1),
    round(coalesce(b.points_against, 0), 1),
    coalesce(b.home_wins, 0),
    coalesce(b.home_losses, 0),
    coalesce(b.away_wins, 0),
    coalesce(b.away_losses, 0),
    coalesce(r.streak, 0),
    coalesce(u.last_results, array[]::text[])
  from lados x
  cross join ventana v
  left join balance b on b.team_id = x.team_id
  left join clasificacion c on c.team_id = x.team_id
  left join ultimos u on u.team_id = x.team_id
  left join racha r on r.team_id = x.team_id
  order by case when x.side = 'home' then 0 else 1 end;
$$;

grant execute on function game_team_form(text) to anon;
grant execute on function game_team_form(text) to authenticated;
