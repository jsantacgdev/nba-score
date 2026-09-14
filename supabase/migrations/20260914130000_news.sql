-- ============================================
-- Noticias
-- ============================================
-- Titulares de ESPN, la misma API interna de la que ya sacamos lesiones.
--
-- El titular se guarda en los dos idiomas. El original nunca se toca, asi
-- que si la traduccion deja de convencer se puede volver al ingles sin
-- recargar nada. El resumen se queda en ingles a proposito: traducirlo
-- multiplicaria por cinco el coste y aporta mucho menos que el titular.
--
-- Cada noticia se traduce UNA vez en su vida, al cargarla. La app nunca
-- llama al modelo.
--
-- ESPN etiqueta cada noticia con los equipos y jugadores de los que habla.
-- Sus identificadores no son los nuestros, asi que el cruce va por nombre
-- y se guarda ya resuelto, para poder enseñar la noticia en la ficha del
-- equipo o del jugador.

create table news_articles (
  id text primary key,
  headline_en text not null,
  headline_es text,
  description text,
  link text,
  image_url text,
  published timestamptz not null,
  -- Identificadores NUESTROS, ya cruzados
  team_ids text[] default '{}',
  player_ids text[] default '{}',
  created_at timestamptz default now()
);

create index idx_news_published on news_articles(published desc);
create index idx_news_teams on news_articles using gin(team_ids);
create index idx_news_players on news_articles using gin(player_ids);

alter table news_articles enable row level security;
create policy "Public read news" on news_articles for select using (true);

-- ============================================
-- Novedades: un solo hilo cronologico
-- ============================================
-- Junta las tres cosas que pasan entre partido y partido: noticias,
-- lesiones y movimientos. La app recibe una lista ya ordenada con un
-- campo 'kind' que le dice como pintar cada fila.
--
-- Los movimientos se limitan a traspasos, fichajes y cortes: las
-- conversiones de contrato no son noticia.

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
      coalesce(n.headline_es, n.headline_en), n.headline_en, n.description,
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
