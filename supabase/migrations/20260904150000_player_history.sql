-- ============================================
-- Historico de jugadores por temporada (2000-01 en adelante)
-- ============================================

-- Campeon de cada temporada. Se deduce del ultimo partido de playoffs
-- en lugar de mantenerse a mano, para que no haya que tocarlo cada junio.
create table season_champions (
  season text primary key,
  team_id text references teams(id),
  decided_at date,
  updated_at timestamptz default now()
);

-- Medias de un jugador en una temporada.
-- La NBA las agrega por temporada completa, no por equipo: un jugador
-- traspasado tiene UNA fila con sus medias combinadas y team_count = 2.
create table player_season_history (
  player_id text references players(id) on delete cascade,
  season text not null,
  primary_team_id text references teams(id),
  team_count int default 1,
  games_played int default 0,
  minutes numeric(4,1) default 0,
  points numeric(4,1) default 0,
  rebounds numeric(4,1) default 0,
  assists numeric(4,1) default 0,
  steals numeric(4,1) default 0,
  blocks numeric(4,1) default 0,
  turnovers numeric(4,1) default 0,
  field_goal_pct numeric(4,3) default 0,
  three_point_pct numeric(4,3) default 0,
  free_throw_pct numeric(4,3) default 0,
  won_championship boolean default false,
  updated_at timestamptz default now(),
  primary key (player_id, season)
);

-- Pertenencia a plantilla: una fila por cada equipo en el que estuvo
-- esa temporada. Es lo que permite reconstruir los traspasos.
create table player_season_teams (
  player_id text references players(id) on delete cascade,
  season text not null,
  team_id text references teams(id) on delete cascade,
  jersey_number text,
  position text,
  updated_at timestamptz default now(),
  primary key (player_id, season, team_id)
);

-- ============================================
-- Indices
-- ============================================
create index idx_history_player on player_season_history(player_id, season desc);
create index idx_history_season on player_season_history(season);
create index idx_history_champions on player_season_history(season) where won_championship;
create index idx_season_teams_team on player_season_teams(team_id, season);
create index idx_season_teams_player on player_season_teams(player_id, season desc);

-- ============================================
-- Row Level Security: lectura publica
-- ============================================
alter table season_champions enable row level security;
alter table player_season_history enable row level security;
alter table player_season_teams enable row level security;

create policy "Public read champions"
  on season_champions for select using (true);

create policy "Public read player_history"
  on player_season_history for select using (true);

create policy "Public read season_teams"
  on player_season_teams for select using (true);
