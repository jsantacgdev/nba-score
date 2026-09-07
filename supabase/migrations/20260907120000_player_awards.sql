-- ============================================
-- Palmares individual de cada jugador
-- ============================================
-- Los premios salen del endpoint playerawards de la NBA, que devuelve la
-- carrera entera de un jugador en una llamada. Guardamos solo los ocho
-- que tienen trofeo en la app; el resto (All-NBA, All-Star, jugador de la
-- semana, medallas olimpicas...) se descarta al sincronizar.
--
-- El anillo se guarda tambien aqui aunque player_season_history ya lo
-- tenga: alli se deduce de estar en la plantilla del campeon, y esto es
-- lo que reconoce la propia NBA. Sirven para cosas distintas.

create table player_awards (
  player_id text references players(id) on delete cascade,
  season text not null,
  -- champion | mvp | finals_mvp | roy | dpoy | mip | clutch | sixth_man
  award text not null,
  team_name text,
  updated_at timestamptz default now(),
  primary key (player_id, season, award)
);

create index idx_awards_player on player_awards(player_id, season desc);
create index idx_awards_award on player_awards(award, season desc);

alter table player_awards enable row level security;

create policy "Public read awards"
  on player_awards for select using (true);

-- Palmares de un jugador, de mas reciente a mas antiguo.
create or replace function player_palmares(target_player_id text)
returns table (
  season text,
  award text,
  team_name text
)
language sql
stable
as $$
  select a.season, a.award, a.team_name
  from player_awards a
  where a.player_id = target_player_id
  order by a.season desc, a.award;
$$;

grant execute on function player_palmares(text) to anon;
grant execute on function player_palmares(text) to authenticated;
