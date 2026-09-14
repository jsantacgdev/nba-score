-- ============================================
-- Las noticias ya vienen en castellano
-- ============================================
-- La API de ESPN acepta lang=es y region=es, y devuelve una edicion propia
-- de ESPN Deportes: titular y resumen redactados en castellano por sus
-- periodistas, con enlace a espn.es, y conservando las etiquetas de equipo
-- y jugador.
--
-- Eso hace innecesaria la traduccion que iba a montarse: ni modelo, ni
-- clave, ni coste, ni el riesgo de que "Bulls waive guard" acabara como
-- "los toros renuncian a la guardia".
--
-- No son las mismas noticias traducidas sino otra redaccion, asi que no
-- tiene sentido guardar las dos versiones: se queda una sola columna.

alter table news_articles drop column headline_es;
alter table news_articles rename column headline_en to headline;

drop function if exists novedades(int);

create or replace function novedades(target_limit int default 60)
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
  deal_id text
)
language sql
stable
as $$
  (
    select
      'news', n.id, n.published,
      n.headline, null, n.description,
      n.link, n.image_url,
      null, null, null,
      null, null, null,
      null, null, null,
      null
    from news_articles n
  )
  union all
  (
    select
      'injury', i.id, coalesce(i.reported_at, i.first_seen_at),
      i.player_name, i.status, i.short_comment,
      null, null,
      i.player_id, i.player_name, p.photo_url,
      i.team_id, t.abbreviation, t.logo_url,
      null, null, null,
      null
    from player_injuries i
    left join players p on p.id = i.player_id
    left join teams t on t.id = i.team_id
    where i.is_current
  )
  union all
  (
    select
      'movement', m.id, m.transaction_date::timestamptz,
      trim(coalesce(p.first_name || ' ' || p.last_name, 'Elección de draft')),
      m.transaction_type, m.description,
      null, null,
      m.player_id, trim(coalesce(p.first_name || ' ' || p.last_name, '')), p.photo_url,
      m.team_id, t.abbreviation, t.logo_url,
      m.from_team_id, o.abbreviation, o.logo_url,
      m.deal_id
    from player_transactions m
    left join players p on p.id = m.player_id
    left join teams t on t.id = m.team_id
    left join teams o on o.id = m.from_team_id
    where m.transaction_type in ('Trade', 'Signing', 'Waive')
  )
  order by 3 desc
  limit target_limit;
$$;

grant execute on function novedades(int) to anon, authenticated;
