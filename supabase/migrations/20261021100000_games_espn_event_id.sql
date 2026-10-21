alter table games add column if not exists espn_event_id text;

create index if not exists games_espn_event_id_idx on games (espn_event_id);
