create or replace function backtest_win_probability(
  target_seasons text[],
  k_regresion numeric default 12,
  coef_descanso numeric default 0.5,
  escala numeric default 11
)
returns table (
  season text,
  partidos int,
  acierto numeric,
  log_loss numeric,
  brier numeric,
  base_local numeric,
  base_balance numeric
)
language sql
stable
as $$
  with base as (
    select
      g.id, g.season, g.starts_at,
      g.home_team_id, g.away_team_id,
      g.score_home, g.score_away
    from games g
    where g.status = 'final'
      and g.season_type = 'regular'
  ),
  lineas as (
    select
      b.id, b.season, b.starts_at,
      b.home_team_id as team_id,
      b.score_home - b.score_away as margen,
      case when b.score_home > b.score_away then 1 else 0 end as win
    from base b
    union all
    select
      b.id, b.season, b.starts_at,
      b.away_team_id,
      b.score_away - b.score_home,
      case when b.score_away > b.score_home then 1 else 0 end
    from base b
  ),
  previas as (
    select
      l.id,
      l.team_id,
      count(*) over w as n_antes,
      coalesce(sum(l.margen) over w, 0)::numeric as margen_antes,
      coalesce(sum(l.win) over w, 0)::numeric as vict_antes
    from lineas l
    window w as (
      partition by l.season, l.team_id
      order by l.starts_at, l.id
      rows between unbounded preceding and 1 preceding
    )
  ),
  descanso as (
    select
      l.id,
      l.team_id,
      extract(
        day from l.starts_at - lag(l.starts_at) over (
          partition by l.season, l.team_id order by l.starts_at, l.id
        )
      ) as dias
    from lineas l
  ),
  temporadas as (
    select distinct b.season from base b
  ),
  anterior as (
    select
      t.season,
      (select max(t2.season) from temporadas t2 where t2.season < t.season) as previa
    from temporadas t
  ),
  net_temporada as (
    select l.season, l.team_id, avg(l.margen) as net
    from lineas l
    group by l.season, l.team_id
  ),
  ventaja as (
    select b.season, avg(b.score_home - b.score_away) as margen_local
    from base b
    group by b.season
  ),
  juego as (
    select
      b.id,
      b.season,
      case when b.score_home > b.score_away then 1 else 0 end as gano_local,
      (
        (ph.margen_antes + k_regresion * coalesce(nh.net, 0))
        / (ph.n_antes + k_regresion)
      ) as rating_local,
      (
        (pa.margen_antes + k_regresion * coalesce(na.net, 0))
        / (pa.n_antes + k_regresion)
      ) as rating_visitante,
      coalesce(v.margen_local, 2.5) as ventaja_campo,
      coef_descanso * (
        least(coalesce(dh.dias, 3), 4) - least(coalesce(da.dias, 3), 4)
      ) as efecto_descanso,
      case
        when ph.n_antes = 0 or pa.n_antes = 0 then null
        else ph.vict_antes / ph.n_antes - pa.vict_antes / pa.n_antes
      end as ventaja_balance
    from base b
    join previas ph on ph.id = b.id and ph.team_id = b.home_team_id
    join previas pa on pa.id = b.id and pa.team_id = b.away_team_id
    join descanso dh on dh.id = b.id and dh.team_id = b.home_team_id
    join descanso da on da.id = b.id and da.team_id = b.away_team_id
    join anterior an on an.season = b.season
    left join net_temporada nh on nh.season = an.previa and nh.team_id = b.home_team_id
    left join net_temporada na on na.season = an.previa and na.team_id = b.away_team_id
    left join ventaja v on v.season = an.previa
    where b.season = any(target_seasons)
  ),
  probabilidad as (
    select
      j.*,
      greatest(
        0.01,
        least(
          0.99,
          1 / (
            1 + power(
              10,
              -(
                (j.rating_local - j.rating_visitante)
                + j.ventaja_campo
                + j.efecto_descanso
              ) / escala
            )
          )
        )
      ) as p
    from juego j
  )
  select
    p.season,
    count(*)::int as partidos,
    round(avg(case when (p.p > 0.5) = (p.gano_local = 1) then 1 else 0 end), 4) as acierto,
    round(
      -avg(p.gano_local * ln(p.p) + (1 - p.gano_local) * ln(1 - p.p)), 4
    ) as log_loss,
    round(avg(power(p.p - p.gano_local, 2)), 4) as brier,
    round(avg(p.gano_local), 4) as base_local,
    round(
      avg(
        case
          when p.ventaja_balance is null then p.gano_local
          when p.ventaja_balance > 0 then p.gano_local
          when p.ventaja_balance < 0 then 1 - p.gano_local
          else p.gano_local
        end
      ),
      4
    ) as base_balance
  from probabilidad p
  group by p.season
  order by p.season;
$$;

grant execute on function backtest_win_probability(text[], numeric, numeric, numeric) to anon;
grant execute on function backtest_win_probability(text[], numeric, numeric, numeric) to authenticated;
