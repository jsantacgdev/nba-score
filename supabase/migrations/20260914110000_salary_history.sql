-- ============================================
-- Lo que ha cobrado cada jugador, temporada a temporada
-- ============================================
-- player_contracts guarda los contratos VIGENTES, con lo que queda por
-- cobrar. Esto es lo contrario: lo ya cobrado, desde su primera temporada.
-- Sale de la ficha personal de Basketball-Reference, una peticion por
-- jugador.
--
-- El equipo puede quedar a nulo: la fuente nombra franquicias que ya no
-- existen, como los Seattle SuperSonics o los Charlotte Bobcats, y esas no
-- estan en nuestra tabla de equipos. Se conserva el nombre en texto para
-- no perder el dato.

create table player_salary_history (
  player_id text not null references players(id) on delete cascade,
  season text not null,
  team_name text not null,
  salary bigint not null,
  team_id text references teams(id),
  updated_at timestamptz default now(),
  primary key (player_id, season, team_name)
);

create index idx_salary_history_player on player_salary_history(player_id, season);

alter table player_salary_history enable row level security;
create policy "Public read salary history" on player_salary_history for select using (true);

-- Identificador del jugador en Basketball-Reference, para no tener que
-- resolverlo por nombre en cada carga
alter table players add column bbref_id text;
create index idx_players_bbref on players(bbref_id) where bbref_id is not null;
