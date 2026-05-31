-- Permitir null en campos derivados del partido
alter table player_game_log alter column game_date drop not null;
alter table player_game_log alter column season drop not null;
alter table player_game_log alter column matchup drop not null;
alter table player_game_log alter column is_home drop not null;