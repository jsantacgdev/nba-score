create table game_predictions (
  game_id text primary key references games(id) on delete cascade,
  predicted_at timestamptz not null default now(),
  prob_home numeric not null,
  expected_margin numeric not null,
  rating_home numeric,
  rating_away numeric,
  home_advantage numeric,
  rest_effect numeric,
  injury_adjustment numeric,
  injuries_home int,
  injuries_away int,
  season text,
  season_type text
);

create index idx_predictions_season on game_predictions(season);

alter table game_predictions enable row level security;

create policy "Public read predictions"
  on game_predictions for select using (true);

create or replace function snapshot_game_predictions(horas int default 36)
returns int
language plpgsql
as $$
declare
  insertados int;
begin
  insert into game_predictions (
    game_id, prob_home, expected_margin, rating_home, rating_away,
    home_advantage, rest_effect, injury_adjustment, injuries_home, injuries_away,
    season, season_type
  )
  select
    g.id, p.prob_home, p.margen_esperado, p.rating_home, p.rating_away,
    p.ventaja_campo, p.efecto_descanso, p.ajuste_bajas, p.bajas_home, p.bajas_away,
    p.temporada, p.tipo
  from games g
  cross join lateral game_win_probability(g.id) p
  where g.status = 'scheduled'
    and g.starts_at between now() and now() + make_interval(hours => horas)
    and not exists (select 1 from game_predictions gp where gp.game_id = g.id)
  on conflict (game_id) do nothing;

  get diagnostics insertados = row_count;
  return insertados;
end;
$$;

revoke execute on function snapshot_game_predictions(int) from public;

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

grant execute on function model_record() to anon;
grant execute on function model_record() to authenticated;
