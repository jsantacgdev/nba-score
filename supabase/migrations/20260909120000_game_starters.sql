-- ============================================
-- Quinteto inicial de cada partido
-- ============================================
-- El front no puede pedirlo a la CDN de la NBA: esa ruta exige la cabecera
-- 'Referer', que la especificacion de fetch prohibe fijar, asi que React
-- Native no la envia y la CDN responde 403. Ademas corta las rafagas, lo
-- que la hace mala fuente para una app. Se resuelve guardandolo aqui y
-- leyendolo como cualquier otro dato.
--
-- Tabla aparte y no una columna en player_game_log para no tener que
-- reprocesar los 550.000 registros ya cargados: son cinco filas por equipo
-- y partido, y se rellenan cuando interese.
--
-- 'spot' conserva el orden en que la NBA lista el quinteto, que es el
-- clasico F, F, C, G, G. No es la posicion real sobre la pista, pero da un
-- orden estable para pintarlo siempre igual.

create table game_starters (
  game_id text not null references games(id) on delete cascade,
  team_id text not null references teams(id),
  player_id text not null references players(id) on delete cascade,
  spot smallint not null check (spot between 0 and 4),
  position text,
  updated_at timestamptz default now(),
  primary key (game_id, team_id, spot)
);

create index idx_starters_game on game_starters(game_id);
create index idx_starters_player on game_starters(player_id);

alter table game_starters enable row level security;

create policy "Public read starters"
  on game_starters for select using (true);

-- ============================================
-- Quinteto inicial de un partido, listo para pintar
-- ============================================
create or replace function game_starting_lineups(target_game_id text)
returns table (
  team_id text,
  team_abbreviation text,
  team_logo_url text,
  spot smallint,
  court_position text,
  player_id text,
  player_name text,
  jersey_number text,
  photo_url text,
  minutes numeric,
  points int,
  rebounds int,
  assists int
)
language sql
stable
as $$
  select
    s.team_id,
    t.abbreviation,
    t.logo_url,
    s.spot,
    s.position as court_position,
    s.player_id,
    trim(p.first_name || ' ' || p.last_name) as player_name,
    p.jersey_number,
    p.photo_url,
    l.minutes,
    l.points,
    l.rebounds,
    l.assists
  from game_starters s
  join teams t on t.id = s.team_id
  join players p on p.id = s.player_id
  -- Las estadisticas de ese partido, si estan cargadas
  left join player_game_log l
    on l.game_id = s.game_id and l.player_id = s.player_id
  where s.game_id = target_game_id
  order by s.team_id, s.spot;
$$;

grant execute on function game_starting_lineups(text) to anon, authenticated;
