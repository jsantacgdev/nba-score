drop function if exists game_win_probability(text);

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
  continuidad_home numeric,
  continuidad_away numeric,
  ajuste_bajas numeric,
  margen_esperado numeric,
  partidos_home int,
  partidos_away int,
  temporada text,
  tipo text
)
language sql
stable
as $$
  with constantes as (
    select
      10::numeric as k_regresion,
      0.5::numeric as coef_descanso,
      1.5::numeric as coef_back_to_back,
      0.99::numeric as olvido,
      0.5::numeric as suelo_continuidad,
      17::numeric as escala,
      10::numeric as peso_bajas
  ),
  partido as (
    select g.id, g.season, g.starts_at, g.status, g.season_type, g.home_team_id, g.away_team_id
    from games g
    where g.id = target_game_id
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
  pesadas as (
    select
      l.team_id,
      l.margen,
      l.starts_at,
      power(
        (select c.olvido from constantes c),
        row_number() over (partition by l.team_id order by l.starts_at desc) - 1
      ) as peso
    from lineas l
  ),
  actual as (
    select
      w.team_id,
      count(*)::int as n,
      sum(w.margen * w.peso)::numeric as suma,
      sum(w.peso)::numeric as peso_total,
      max(w.starts_at) as ultimo
    from pesadas w
    group by w.team_id
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
  roster_actual as (
    select pst.team_id, pst.player_id
    from player_season_teams pst, partido p
    where pst.season = p.season
  ),
  valor_previo as (
    select
      pst.player_id,
      max(
        coalesce(pst.points, 0)
        + 1.2 * coalesce(pst.rebounds, 0)
        + 1.5 * coalesce(pst.assists, 0)
      ) as valor
    from player_season_teams pst, previa pv
    where pst.season = pv.season
      and coalesce(pst.games_played, 0) >= 10
    group by pst.player_id
  ),
  seguia as (
    select distinct pst.team_id, pst.player_id
    from player_season_teams pst, previa pv
    where pst.season = pv.season
  ),
  continuidad as (
    select
      ra.team_id,
      case
        when sum(coalesce(vp.valor, 0)) > 0 then
          sum(case when sg.player_id is not null then coalesce(vp.valor, 0) else 0 end)
          / sum(coalesce(vp.valor, 0))
        else 1.0
      end as factor
    from roster_actual ra
    left join valor_previo vp on vp.player_id = ra.player_id
    left join seguia sg on sg.team_id = ra.team_id and sg.player_id = ra.player_id
    group by ra.team_id
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
  gravedad as (
    select
      i.team_id,
      i.player_id,
      case
        when i.status ilike 'Out%' then 1.0
        when i.status ilike 'Doubtful%' then 0.75
        when i.status ilike 'Questionable%' or i.status ilike 'Game Time%' then 0.4
        when i.status ilike 'Day-To-Day%' then 0.25
        when i.status ilike 'Probable%' then 0.1
        else 0.0
      end::numeric as factor
    from player_injuries i
    where i.is_current and i.team_id is not null
  ),
  bajas as (
    select
      gr.team_id,
      count(*) filter (where gr.factor >= 0.75)::int as n,
      coalesce(sum(gr.factor * coalesce(s.points, 0)), 0)::numeric as puntos
    from gravedad gr
    left join player_season_stats s
      on s.player_id = gr.player_id and s.season = (select r.season from ref r)
    where gr.factor > 0
    group by gr.team_id
  ),
  piezas as (
    select
      p.home_team_id,
      p.away_team_id,
      p.season,
      p.status,
      p.season_type,
      (coalesce(ah.suma, 0)
        + c.k_regresion * coalesce(nh.net, 0)
          * (c.suelo_continuidad + (1 - c.suelo_continuidad) * coalesce(kh.factor, 1.0)))
        / (coalesce(ah.peso_total, 0) + c.k_regresion) as rating_home,
      (coalesce(aa.suma, 0)
        + c.k_regresion * coalesce(na.net, 0)
          * (c.suelo_continuidad + (1 - c.suelo_continuidad) * coalesce(ka.factor, 1.0)))
        / (coalesce(aa.peso_total, 0) + c.k_regresion) as rating_away,
      coalesce(kh.factor, 1.0) as continuidad_home,
      coalesce(ka.factor, 1.0) as continuidad_away,
      cp.margen_local as ventaja_campo,
      least(coalesce((date(p.starts_at) - date(ah.ultimo)), 3), 4) as dias_home,
      least(coalesce((date(p.starts_at) - date(aa.ultimo)), 3), 4) as dias_away,
      coalesce(ah.n, 0) as partidos_home,
      coalesce(aa.n, 0) as partidos_away,
      coalesce(bh.n, 0) as bajas_home,
      coalesce(ba.n, 0) as bajas_away,
      case
        when p.status not in ('scheduled', 'live') then 0
        else c.peso_bajas * (
          coalesce(ba.puntos / nullif(pa.puntos, 0), 0)
          - coalesce(bh.puntos / nullif(ph.puntos, 0), 0)
        )
      end as ajuste_bajas,
      c.coef_descanso,
      c.coef_back_to_back,
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
    left join continuidad kh on kh.team_id = p.home_team_id
    left join continuidad ka on ka.team_id = p.away_team_id
  ),
  margenes as (
    select
      z.*,
      z.coef_descanso * (z.dias_home - z.dias_away)
      + z.coef_back_to_back * (
          (case when z.dias_away <= 1 then 1 else 0 end)
          - (case when z.dias_home <= 1 then 1 else 0 end)
        ) as efecto_descanso
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
    round(t.continuidad_home, 3) as continuidad_home,
    round(t.continuidad_away, 3) as continuidad_away,
    round(t.ajuste_bajas, 2) as ajuste_bajas,
    round(t.margen_sin_bajas + t.ajuste_bajas, 2) as margen_esperado,
    t.partidos_home,
    t.partidos_away,
    t.season as temporada,
    t.season_type as tipo
  from total t;
$$;

grant execute on function game_win_probability(text) to anon;
grant execute on function game_win_probability(text) to authenticated;
