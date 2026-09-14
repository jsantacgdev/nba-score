-- ============================================
-- El nombre del jugador cuando no esta en nuestra tabla
-- ============================================
-- 562 de los 2.263 jugadores del feed de movimientos nunca llegaron a
-- disputar un partido, asi que no estan en players. Sus filas salian con
-- el nombre en blanco en la ficha de equipo y en el detalle de la
-- operacion, y eso se ve mucho ahora mismo: casi todos los cortes de
-- pretemporada son de jugadores que no han debutado.
--
-- El feed trae un slug ("devin-carter") del que sale el nombre sin
-- depender del cruce. Es lo mismo que ya hace el hilo de novedades.
--
-- Donde el nombre vacio SI significaba algo era en el detalle de la
-- operacion: una fila sin jugador es una eleccion de draft. Eso no cambia,
-- porque lo decide is_draft_pick, que mira player_id y no el nombre.

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
    case
      when t.transaction_type = 'Waive' then 'out'
      when t.team_id = target_team_id then 'in'
      else 'out'
    end as direction,
    t.player_id,
    coalesce(
      nullif(trim(p.first_name || ' ' || p.last_name), ''),
      nombre_desde_slug(t.player_slug),
      ''
    ) as player_name,
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
  is_draft_pick boolean,
  draft_round int,
  draft_pick_year int,
  draft_note text
)
language sql
stable
as $$
  select
    t.id,
    t.transaction_date,
    t.description,
    t.player_id,
    coalesce(
      nullif(trim(p.first_name || ' ' || p.last_name), ''),
      nombre_desde_slug(t.player_slug),
      ''
    ) as player_name,
    p.photo_url,
    t.from_team_id,
    o.abbreviation,
    o.name,
    o.logo_url,
    t.team_id,
    d.abbreviation,
    d.name,
    d.logo_url,
    (t.player_id is null) as is_draft_pick,
    t.draft_round,
    t.draft_pick_year,
    t.draft_note
  from player_transactions t
  left join players p on p.id = t.player_id
  left join teams o on o.id = t.from_team_id
  left join teams d on d.id = t.team_id
  where t.deal_id = target_deal_id
  order by d.abbreviation, (t.player_id is null), p.last_name;
$$;

grant execute on function team_movements(text) to anon, authenticated;
grant execute on function deal_detail(text) to anon, authenticated;
