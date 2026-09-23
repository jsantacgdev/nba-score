create or replace function game_win_probability(target_game_id text)
returns table (
  home_team_id text,
  away_team_id text,
  prob_home numeric,
  prob_home_sin_bajas numeric,
  rating_home numeric,
  rating_away numeric,
  ventaja_campo numeric,
  efecto_descanso numeric,
  dias_home int,
  dias_away int,
  bajas_home int,
  bajas_away int,
  ajuste_bajas numeric,
  margen_esperado numeric,
  partidos_home int,
  partidos_away int,
  temporada text
)
language sql
stable
as $$
  with constantes as (
    select
      10::numeric as k_regresion,
      1::numeric as coef_descanso,
      20::numeric as escala,
      10::numeric as peso_bajas
  ),
  partido as (
    select g.id, g.season, g.starts_at, g.status, g.home_team_id, g.away_team_id
    from games g
    where g.id = target_game_id
      and g.season_type <> 'preseason'
  ),
  todas as (
    select distinct g.season from games g where g.season_type = 'regular'
  ),
  previa as (
    select max(t.season) as season
    from todas t, partido p
    where t.season < p.season
  ),
  ref as (
    select max(s.season) as season from player_season_stats s
  ),
  lineas as (
    select g.home_team_id as team_id, g.score_home - g.score_away as margen, g.starts_at
    from games g, partido p
    where g.season = p.season
      and g.status = 'final'
      and g.season_type <> 'preseason'
      and g.starts_at < p.starts_at
    union all
    select g.away_team_id, g.score_away - g.score_home, g.starts_at
    from games g, partido p
    where g.season = p.season
      and g.status = 'final'
      and g.season_type <> 'preseason'
      and g.starts_at < p.starts_at
  ),
  actual as (
    select
      l.team_id,
      count(*)::int as n,
      sum(l.margen)::numeric as suma,
      max(l.starts_at) as ultimo
    from lineas l
    group by l.team_id
  ),
  lineas_previa as (
    select g.home_team_id as team_id, g.score_home - g.score_away as margen
    from games g, previa pv
    where g.season = pv.season and g.status = 'final' and g.season_type = 'regular'
    union all
    select g.away_team_id, g.score_away - g.score_home
    from games g, previa pv
    where g.season = pv.season and g.status = 'final' and g.season_type = 'regular'
  ),
  net_previa as (
    select lp.team_id, avg(lp.margen) as net
    from lineas_previa lp
    group by lp.team_id
  ),
  campo as (
    select coalesce(avg(g.score_home - g.score_away), 2.5) as margen_local
    from games g, previa pv
    where g.season = pv.season and g.status = 'final' and g.season_type = 'regular'
  ),
  plantilla as (
    select pl.team_id, sum(s.points)::numeric as puntos
    from players pl
    join player_season_stats s on s.player_id = pl.id and s.season = (select r.season from ref r)
    where pl.is_active and pl.team_id is not null
    group by pl.team_id
  ),
  bajas as (
    select
      i.team_id,
      count(*)::int as n,
      coalesce(sum(s.points), 0)::numeric as puntos
    from player_injuries i
    left join player_season_stats s
      on s.player_id = i.player_id and s.season = (select r.season from ref r)
    where i.is_current
      and i.status like 'Out%'
      and i.team_id is not null
    group by i.team_id
  ),
  piezas as (
    select
      p.home_team_id,
      p.away_team_id,
      p.season,
      p.status,
      (coalesce(ah.suma, 0) + c.k_regresion * coalesce(nh.net, 0))
        / (coalesce(ah.n, 0) + c.k_regresion) as rating_home,
      (coalesce(aa.suma, 0) + c.k_regresion * coalesce(na.net, 0))
        / (coalesce(aa.n, 0) + c.k_regresion) as rating_away,
      cp.margen_local as ventaja_campo,
      least(coalesce((date(p.starts_at) - date(ah.ultimo)), 3), 4) as dias_home,
      least(coalesce((date(p.starts_at) - date(aa.ultimo)), 3), 4) as dias_away,
      coalesce(ah.n, 0) as partidos_home,
      coalesce(aa.n, 0) as partidos_away,
      coalesce(bh.n, 0) as bajas_home,
      coalesce(ba.n, 0) as bajas_away,
      case
        when p.status <> 'scheduled' then 0
        else c.peso_bajas * (
          coalesce(ba.puntos / nullif(pa.puntos, 0), 0)
          - coalesce(bh.puntos / nullif(ph.puntos, 0), 0)
        )
      end as ajuste_bajas,
      c.coef_descanso,
      c.escala
    from partido p
    cross join constantes c
    cross join campo cp
    left join actual ah on ah.team_id = p.home_team_id
    left join actual aa on aa.team_id = p.away_team_id
    left join net_previa nh on nh.team_id = p.home_team_id
    left join net_previa na on na.team_id = p.away_team_id
    left join bajas bh on bh.team_id = p.home_team_id
    left join bajas ba on ba.team_id = p.away_team_id
    left join plantilla ph on ph.team_id = p.home_team_id
    left join plantilla pa on pa.team_id = p.away_team_id
  ),
  margenes as (
    select
      z.*,
      z.coef_descanso * (z.dias_home - z.dias_away) as efecto_descanso
    from piezas z
  ),
  total as (
    select
      m.*,
      (m.rating_home - m.rating_away) + m.ventaja_campo + m.efecto_descanso as margen_sin_bajas
    from margenes m
  )
  select
    t.home_team_id,
    t.away_team_id,
    round(
      greatest(0.02, least(0.98,
        1 / (1 + power(10, -(t.margen_sin_bajas + t.ajuste_bajas) / t.escala))
      )), 4
    ) as prob_home,
    round(
      greatest(0.02, least(0.98,
        1 / (1 + power(10, -t.margen_sin_bajas / t.escala))
      )), 4
    ) as prob_home_sin_bajas,
    round(t.rating_home, 2) as rating_home,
    round(t.rating_away, 2) as rating_away,
    round(t.ventaja_campo, 2) as ventaja_campo,
    round(t.efecto_descanso, 2) as efecto_descanso,
    t.dias_home::int,
    t.dias_away::int,
    t.bajas_home,
    t.bajas_away,
    round(t.ajuste_bajas, 2) as ajuste_bajas,
    round(t.margen_sin_bajas + t.ajuste_bajas, 2) as margen_esperado,
    t.partidos_home,
    t.partidos_away,
    t.season as temporada
  from total t;
$$;

grant execute on function game_win_probability(text) to anon;
grant execute on function game_win_probability(text) to authenticated;
