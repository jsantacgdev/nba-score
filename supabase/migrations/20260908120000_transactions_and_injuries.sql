-- ============================================
-- Movimientos de jugadores y lesiones
-- ============================================
-- Dos fuentes que no estan en nba_api ni en el plan gratuito de
-- balldontlie, y que cubren los dos huecos que teniamos.

-- --------------------------------------------
-- Movimientos: traspasos, fichajes y cortes
-- --------------------------------------------
-- Origen: el JSON publico de movimientos de stats.nba.com. Trae 9.784
-- registros desde julio de 2015, con fecha exacta y descripcion, y
-- distingue traspaso de fichaje y de corte, cosa que hasta ahora era
-- imposible: en player_season_teams un cambio de equipo podia ser
-- cualquiera de los tres.
--
-- Empieza en 2015 y nuestro archivo llega a 1984, asi que cubre once
-- temporadas, no las cuarenta y dos.
--
-- Sin clave foranea a players: 562 de los 2.263 jugadores del feed nunca
-- llegaron a disputar un partido y no estan en nuestra tabla.
--
-- El identificador es el md5 de lo que define el movimiento, porque el
-- feed no trae ninguno y la tupla natural se repite: hay 10 registros
-- duplicados literalmente en origen.

create table player_transactions (
  id text primary key,
  player_id text,
  team_id text,
  transaction_type text not null,
  transaction_date date not null,
  description text not null,
  player_slug text,
  team_slug text,
  updated_at timestamptz default now()
);

create index idx_transactions_player on player_transactions(player_id, transaction_date desc);
create index idx_transactions_team on player_transactions(team_id, transaction_date desc);
create index idx_transactions_date on player_transactions(transaction_date desc);
create index idx_transactions_type on player_transactions(transaction_type, transaction_date desc);

alter table player_transactions enable row level security;

create policy "Public read transactions"
  on player_transactions for select using (true);

-- --------------------------------------------
-- Lesiones
-- --------------------------------------------
-- Origen: el feed de lesiones de ESPN, que da estado, tipo, lado del
-- cuerpo, fecha estimada de vuelta y un comentario. Mas campos que el
-- endpoint de pago de balldontlie.
--
-- Es una foto del presente, no un historico: el feed solo devuelve las
-- lesiones vigentes. El historico se construye guardando la foto cada vez
-- que se sincroniza, y de ahi salen first_seen_at y last_seen_at: cuando
-- aparecio la lesion y cuando se la vio por ultima vez. Si deja de
-- aparecer, last_seen_at marca aproximadamente el alta.
--
-- ESPN no publica el identificador de jugador de la NBA, solo nombres,
-- asi que el cruce es por nombre normalizado. Hoy casan los 74 sin
-- ambiguedad, pero se guarda tambien el identificador de ESPN por si un
-- dia el nombre no basta.

create table player_injuries (
  id text primary key,
  player_id text references players(id) on delete cascade,
  espn_athlete_id text,
  player_name text not null,
  team_id text references teams(id),
  status text,
  injury_type text,
  side text,
  return_date date,
  short_comment text,
  long_comment text,
  reported_at timestamptz,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  -- Se apaga cuando la lesion desaparece del feed
  is_current boolean not null default true
);

create index idx_injuries_player on player_injuries(player_id, reported_at desc);
create index idx_injuries_team on player_injuries(team_id) where is_current;
create index idx_injuries_current on player_injuries(is_current, reported_at desc);

alter table player_injuries enable row level security;

create policy "Public read injuries"
  on player_injuries for select using (true);
