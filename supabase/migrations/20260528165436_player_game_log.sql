create table player_game_log (
  player_id text references players(id) on delete cascade,
  game_id text not null,
  game_date timestamptz not null,
  season text not null,
  matchup text not null,
  is_home boolean not null,
  opponent_abbreviation text,
  win_loss text,
  minutes numeric(4,1) default 0,
  points int default 0,
  rebounds int default 0,
  assists int default 0,
  steals int default 0,
  blocks int default 0,
  turnovers int default 0,
  fg_made int default 0,
  fg_attempted int default 0,
  fg3_made int default 0,
  fg3_attempted int default 0,
  ft_made int default 0,
  ft_attempted int default 0,
  plus_minus int default 0,
  updated_at timestamptz default now(),
  primary key (player_id, game_id)
);

create index idx_game_log_player on player_game_log(player_id, game_date desc);

alter table player_game_log enable row level security;

create policy "Public read game_log"
  on player_game_log for select using (true);