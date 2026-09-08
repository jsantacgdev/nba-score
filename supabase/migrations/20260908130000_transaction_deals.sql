-- ============================================
-- Equipo de origen y agrupacion por operacion
-- ============================================
-- El feed da una fila por jugador y equipo receptor, asi que un traspaso a
-- tres bandas llega partido en nueve filas sueltas. Para poder enseñar la
-- operacion completa hacen falta dos cosas que el feed no da hechas:
--
--   * from_team_id: el equipo que cede. Va dentro del texto ("... from
--     Dallas Mavericks") y se extrae al cargar. Los 1.798 traspasos lo
--     llevan.
--
--   * deal_id: que filas pertenecen a la misma operacion. Agrupar por
--     fecha no vale, porque un dia de mercado junta decenas de traspasos
--     sin relacion. Se agrupa por fecha y equipos conectados entre si:
--     si A cede a B y B cede a C, los tres son la misma operacion.
--
--     Su limite: dos operaciones distintas el mismo dia que compartan un
--     equipo se fusionan en una. Es poco frecuente y preferible a no
--     agrupar.

alter table player_transactions add column from_team_id text;
alter table player_transactions add column deal_id text;

create index idx_transactions_from_team on player_transactions(from_team_id, transaction_date desc);
create index idx_transactions_deal on player_transactions(deal_id);

-- ============================================
-- Movimientos de un jugador
-- ============================================
create or replace function player_movements(target_player_id text)
returns table (
  id text,
  deal_id text,
  transaction_type text,
  transaction_date date,
  description text,
  from_team_id text,
  from_abbreviation text,
  from_logo_url text,
  to_team_id text,
  to_abbreviation text,
  to_logo_url text
)
language sql
stable
as $$
  select
    t.id,
    t.deal_id,
    t.transaction_type,
    t.transaction_date,
    t.description,
    t.from_team_id,
    o.abbreviation,
    o.logo_url,
    t.team_id,
    d.abbreviation,
    d.logo_url
  from player_transactions t
  left join teams o on o.id = t.from_team_id
  left join teams d on d.id = t.team_id
  where t.player_id = target_player_id
  order by t.transaction_date desc, t.id;
$$;

-- ============================================
-- Traspasos de un equipo, con la direccion
-- ============================================
-- Se listan tanto los que entran como los que salen: un traspaso es un
-- movimiento del equipo aunque el jugador se marche.
create or replace function team_movements(target_team_id text)
returns table (
  id text,
  deal_id text,
  transaction_type text,
  transaction_date date,
  description text,
  direction text,
  player_id text,
  player_name text,
  photo_url text,
  other_team_id text,
  other_abbreviation text,
  other_logo_url text
)
language sql
stable
as $$
  select
    t.id,
    t.deal_id,
    t.transaction_type,
    t.transaction_date,
    t.description,
    case when t.team_id = target_team_id then 'in' else 'out' end as direction,
    t.player_id,
    trim(coalesce(p.first_name || ' ' || p.last_name, '')) as player_name,
    p.photo_url,
    case when t.team_id = target_team_id then t.from_team_id else t.team_id end,
    other.abbreviation,
    other.logo_url
  from player_transactions t
  left join players p on p.id = t.player_id
  left join teams other
    on other.id = case when t.team_id = target_team_id then t.from_team_id else t.team_id end
  where t.team_id = target_team_id or t.from_team_id = target_team_id
  order by t.transaction_date desc, t.id;
$$;

-- ============================================
-- Detalle de una operacion completa
-- ============================================
create or replace function deal_detail(target_deal_id text)
returns table (
  id text,
  transaction_date date,
  description text,
  player_id text,
  player_name text,
  photo_url text,
  from_team_id text,
  from_abbreviation text,
  from_name text,
  from_logo_url text,
  to_team_id text,
  to_abbreviation text,
  to_name text,
  to_logo_url text,
  is_draft_pick boolean
)
language sql
stable
as $$
  select
    t.id,
    t.transaction_date,
    t.description,
    t.player_id,
    trim(coalesce(p.first_name || ' ' || p.last_name, '')) as player_name,
    p.photo_url,
    t.from_team_id,
    o.abbreviation,
    o.name,
    o.logo_url,
    t.team_id,
    d.abbreviation,
    d.name,
    d.logo_url,
    (t.player_id is null) as is_draft_pick
  from player_transactions t
  left join players p on p.id = t.player_id
  left join teams o on o.id = t.from_team_id
  left join teams d on d.id = t.team_id
  where t.deal_id = target_deal_id
  order by d.abbreviation, (t.player_id is null), p.last_name;
$$;

-- ============================================
-- Lesiones de un jugador
-- ============================================
create or replace function player_injury_history(target_player_id text)
returns table (
  id text,
  status text,
  injury_type text,
  side text,
  return_date date,
  short_comment text,
  long_comment text,
  reported_at timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  is_current boolean,
  team_id text,
  team_abbreviation text,
  team_logo_url text
)
language sql
stable
as $$
  select
    i.id,
    i.status,
    i.injury_type,
    i.side,
    i.return_date,
    i.short_comment,
    i.long_comment,
    i.reported_at,
    i.first_seen_at,
    i.last_seen_at,
    i.is_current,
    i.team_id,
    t.abbreviation,
    t.logo_url
  from player_injuries i
  left join teams t on t.id = i.team_id
  where i.player_id = target_player_id
  order by i.is_current desc, i.reported_at desc nulls last;
$$;

grant execute on function player_movements(text) to anon, authenticated;
grant execute on function team_movements(text) to anon, authenticated;
grant execute on function deal_detail(text) to anon, authenticated;
grant execute on function player_injury_history(text) to anon, authenticated;
