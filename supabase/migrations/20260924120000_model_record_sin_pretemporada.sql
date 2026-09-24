create or replace function model_record()
returns table (
  season text,
  resueltos int,
  aciertos int,
  acierto numeric,
  pendientes int
)
language sql
stable
as $$
  with resueltas as (
    select
      gp.season,
      g.status = 'final' as jugado,
      (gp.prob_home > 0.5) = (g.score_home > g.score_away) as acertada
    from game_predictions gp
    join games g on g.id = gp.game_id
    where gp.season_type <> 'preseason'
  )
  select
    r.season,
    count(*) filter (where r.jugado)::int as resueltos,
    count(*) filter (where r.jugado and r.acertada)::int as aciertos,
    case
      when count(*) filter (where r.jugado) > 0
        then round(
          count(*) filter (where r.jugado and r.acertada)::numeric
            / count(*) filter (where r.jugado), 4
        )
      else 0
    end as acierto,
    count(*) filter (where not r.jugado)::int as pendientes
  from resueltas r
  group by r.season
  order by r.season desc;
$$;
