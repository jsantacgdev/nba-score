create table player_season_stats (
  player_id text references players(id) on delete cascade,
  season text not null,
  games_played int default 0,
  minutes numeric(4,1) default 0,
  points numeric(4,1) default 0,
  rebounds numeric(4,1) default 0,
  assists numeric(4,1) default 0,
  steals numeric(4,1) default 0,
  blocks numeric(4,1) default 0,
  field_goal_pct numeric(4,3) default 0,
  three_point_pct numeric(4,3) default 0,
  free_throw_pct numeric(4,3) default 0,
  updated_at timestamptz default now(),
  primary key (player_id, season)
);

create index idx_season_stats_player on player_season_stats(player_id);

alter table player_season_stats enable row level security;

create policy "Public read season_stats"
  on player_season_stats for select using (true);