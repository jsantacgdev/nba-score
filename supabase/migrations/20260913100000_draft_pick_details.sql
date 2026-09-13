-- ============================================
-- Ronda y año de las elecciones traspasadas
-- ============================================
-- El feed de la NBA repite 518 veces "draft consideration" sin decir si la
-- eleccion es de primera o de segunda ronda, y ESPN solo lo detalla en un
-- tercio de los casos y en prosa. Basketball-Reference si lo publica
-- entero, con ronda, año y las protecciones, asi que estas columnas se
-- rellenan desde ahi.
--
-- Se quedan a nulo cuando no se ha podido confirmar: mejor seguir
-- mostrando "Eleccion de draft" que arriesgar una ronda equivocada.

alter table player_transactions add column draft_round int;
alter table player_transactions add column draft_pick_year int;
-- Protecciones y condiciones, tal cual las describe la fuente
alter table player_transactions add column draft_note text;

create index idx_transactions_draft_round on player_transactions(draft_round)
  where draft_round is not null;

-- ============================================
-- El detalle viaja con el resto de la operacion
-- ============================================
drop function if exists deal_detail(text);

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

grant execute on function deal_detail(text) to anon, authenticated;
