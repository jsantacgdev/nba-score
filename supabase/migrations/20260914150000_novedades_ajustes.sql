-- ============================================
-- Novedades: nombre del jugador y filtro por tipo
-- ============================================
-- Dos arreglos sobre la funcion anterior.
--
-- 1. El titulo de un movimiento salia como "Eleccion de draft" siempre que
--    el jugador no estaba en nuestra tabla, y no solo cuando la pieza era
--    de verdad una eleccion. Pasa con los recien cortados de pretemporada:
--    nunca han jugado un partido, asi que no existen para nosotros. El
--    feed de la NBA trae ademas un slug ("devin-carter") que sirve para
--    escribir el nombre sin depender del cruce.
--
-- 2. Las lesiones quedaban sepultadas. El hilo va por fecha y las nuestras
--    son mas antiguas que los titulares y los movimientos, asi que en las
--    primeras treinta filas no aparecia ninguna. En vez de alterar el
--    orden, que seria mentir sobre cuando paso cada cosa, se deja filtrar
--    por tipo y se resuelve en la consulta, sin traerse el hilo entero.

-- --------------------------------------------
-- El slug como nombre
-- --------------------------------------------
-- "robert-williams-iii" se convierte en "Robert Williams III": initcap
-- deja los ordinales en "Iii", que es lo unico que hay que repasar.
create or replace function nombre_desde_slug(slug text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(slug, '') = '' then null
    else regexp_replace(
           regexp_replace(
             regexp_replace(initcap(replace(slug, '-', ' ')), ' Iii$', ' III'),
             ' Ii$', ' II'),
           ' Iv$', ' IV')
  end;
$$;

drop function if exists novedades(int);

create or replace function novedades(
  target_limit int default 60,
  kind_filter text default null
)
returns table (
  kind text,
  id text,
  happened_at timestamptz,
  title text,
  subtitle text,
  detail text,
  link text,
  image_url text,
  player_id text,
  player_name text,
  photo_url text,
  team_id text,
  team_abbreviation text,
  team_logo_url text,
  other_team_id text,
  other_abbreviation text,
  other_logo_url text,
  deal_id text,
  injury_type text,
  injury_side text
)
language sql
stable
as $$
  select
    f.kind, f.id, f.happened_at,
    f.title, f.subtitle, f.detail,
    f.link, f.image_url,
    f.player_id, f.player_name, f.photo_url,
    f.team_id, f.team_abbreviation, f.team_logo_url,
    f.other_team_id, f.other_abbreviation, f.other_logo_url,
    f.deal_id, f.injury_type, f.injury_side
  from (
    select
      'news' as kind, n.id as id, n.published as happened_at,
      n.headline as title, null::text as subtitle, n.description as detail,
      n.link as link, n.image_url as image_url,
      null::text as player_id, null::text as player_name, null::text as photo_url,
      null::text as team_id, null::text as team_abbreviation, null::text as team_logo_url,
      null::text as other_team_id, null::text as other_abbreviation,
      null::text as other_logo_url,
      null::text as deal_id,
      null::text as injury_type, null::text as injury_side
    from news_articles n

    union all

    select
      'injury', i.id, coalesce(i.reported_at, i.first_seen_at),
      i.player_name, i.status, coalesce(i.short_comment, i.long_comment),
      null, null,
      i.player_id, i.player_name, p.photo_url,
      i.team_id, t.abbreviation, t.logo_url,
      null, null, null,
      null,
      i.injury_type, i.side
    from player_injuries i
    left join players p on p.id = i.player_id
    left join teams t on t.id = i.team_id
    where i.is_current

    union all

    select
      'movement', m.id, m.transaction_date::timestamptz,
      coalesce(
        nullif(trim(p.first_name || ' ' || p.last_name), ''),
        nombre_desde_slug(m.player_slug),
        'Elección de draft'
      ),
      m.transaction_type, m.description,
      null, null,
      m.player_id,
      coalesce(
        nullif(trim(p.first_name || ' ' || p.last_name), ''),
        nombre_desde_slug(m.player_slug)
      ),
      p.photo_url,
      m.team_id, t.abbreviation, t.logo_url,
      m.from_team_id, o.abbreviation, o.logo_url,
      m.deal_id,
      null, null
    from player_transactions m
    left join players p on p.id = m.player_id
    left join teams t on t.id = m.team_id
    left join teams o on o.id = m.from_team_id
    where m.transaction_type in ('Trade', 'Signing', 'Waive')
  ) f
  where kind_filter is null or f.kind = kind_filter
  order by f.happened_at desc
  limit target_limit;
$$;

grant execute on function novedades(int, text) to anon, authenticated;
grant execute on function nombre_desde_slug(text) to anon, authenticated;
