-- ============================================
-- Tabla: teams (equipos)
-- ============================================
create table teams (
  id text primary key,
  name text not null,
  full_name text not null,
  abbreviation text not null,
  city text not null,
  conference text not null check (conference in ('East', 'West')),
  division text,
  logo_url text,
  created_at timestamptz default now()
);

-- ============================================
-- Tabla: players (jugadores)
-- ============================================
create table players (
  id text primary key,
  team_id text references teams(id) on delete set null,
  first_name text not null,
  last_name text not null,
  position text,
  jersey_number text,
  photo_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Tabla: games (partidos)
-- ============================================
create table games (
  id text primary key,
  home_team_id text references teams(id) not null,
  away_team_id text references teams(id) not null,
  starts_at timestamptz not null,
  status text not null check (status in ('scheduled', 'live', 'final')),
  score_home int default 0,
  score_away int default 0,
  period int default 0,
  time_remaining text,
  season text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Tabla: player_game_stats
-- ============================================
create table player_game_stats (
  game_id text references games(id) on delete cascade,
  player_id text references players(id) on delete cascade,
  team_id text references teams(id),
  minutes numeric(4,1) default 0,
  points int default 0,
  rebounds_offensive int default 0,
  rebounds_defensive int default 0,
  rebounds_total int default 0,
  assists int default 0,
  steals int default 0,
  blocks int default 0,
  turnovers int default 0,
  fouls int default 0,
  fg_made int default 0,
  fg_attempted int default 0,
  fg3_made int default 0,
  fg3_attempted int default 0,
  ft_made int default 0,
  ft_attempted int default 0,
  plus_minus int default 0,
  updated_at timestamptz default now(),
  primary key (game_id, player_id)
);

-- ============================================
-- Tabla: game_mvp
-- ============================================
create table game_mvp (
  game_id text primary key references games(id) on delete cascade,
  player_id text references players(id),
  game_score numeric(5,2),
  reasoning text,
  calculated_at timestamptz default now()
);

-- ============================================
-- Índices para queries comunes
-- ============================================
create index idx_games_date on games(starts_at);
create index idx_games_status_live on games(status) where status = 'live';
create index idx_players_team on players(team_id) where is_active = true;
create index idx_player_stats_player on player_game_stats(player_id);
create index idx_player_stats_game on player_game_stats(game_id);

-- ============================================
-- Row Level Security: lectura pública
-- ============================================
alter table teams enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table player_game_stats enable row level security;
alter table game_mvp enable row level security;

create policy "Public read teams"
  on teams for select using (true);

create policy "Public read players"
  on players for select using (true);

create policy "Public read games"
  on games for select using (true);

create policy "Public read player_stats"
  on player_game_stats for select using (true);

create policy "Public read mvp"
  on game_mvp for select using (true);