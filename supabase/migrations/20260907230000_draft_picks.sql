-- ============================================
-- Histórico del draft
-- ============================================
-- Una sola llamada a DraftHistory devuelve las 8434 selecciones desde
-- 1947, con el identificador de jugador ya incluido.
--
-- Decisiones que vienen de mirar los datos antes de escribir esto:
--
--   * La clave es (jugador, año), no el jugador solo: 136 jugadores
--     fueron elegidos dos veces. Sabonis salio en 1985 con el 77 y de
--     nuevo en 1986 con el 24.
--
--   * Sin clave foranea a players: la mayoria de los 8434 elegidos nunca
--     llegaron a jugar en la NBA y no estan en nuestra tabla.
--
--   * Sin clave foranea a teams: hay franquicias desaparecidas que
--     eligieron en los 50 y 60.
--
--   * overall_pick admite 0: las elecciones territoriales de los años 60
--     no llevaban numero.

create table draft_picks (
  player_id text not null,
  draft_year int not null,
  player_name text not null,
  round int,
  round_pick int,
  overall_pick int,
  team_id text,
  team_abbreviation text,
  organization text,
  updated_at timestamptz default now(),
  primary key (player_id, draft_year)
);

create index idx_draft_year on draft_picks(draft_year, overall_pick);
create index idx_draft_player on draft_picks(player_id, draft_year desc);

alter table draft_picks enable row level security;

create policy "Public read draft"
  on draft_picks for select using (true);

-- ============================================
-- Años con draft registrado, del mas reciente al mas antiguo
-- ============================================
create or replace function draft_years()
returns table (
  draft_year int,
  picks int,
  rounds int
)
language sql
stable
as $$
  select
    d.draft_year,
    count(*)::int as picks,
    count(distinct d.round)::int as rounds
  from draft_picks d
  group by d.draft_year
  order by d.draft_year desc;
$$;

-- ============================================
-- Selecciones de un año, con el equipo actual si la franquicia sigue viva
-- ============================================
create or replace function draft_class(target_year int)
returns table (
  player_id text,
  player_name text,
  round int,
  round_pick int,
  overall_pick int,
  team_id text,
  team_abbreviation text,
  team_logo_url text,
  organization text,
  -- Si esta en players es que llego a la NBA y tiene ficha que abrir
  has_profile boolean
)
language sql
stable
as $$
  select
    d.player_id,
    d.player_name,
    d.round,
    d.round_pick,
    d.overall_pick,
    d.team_id,
    coalesce(t.abbreviation, d.team_abbreviation) as team_abbreviation,
    t.logo_url as team_logo_url,
    d.organization,
    (p.id is not null) as has_profile
  from draft_picks d
  left join teams t on t.id = d.team_id
  left join players p on p.id = d.player_id
  where d.draft_year = target_year
  order by d.round, d.round_pick, d.overall_pick;
$$;

grant execute on function draft_years() to anon;
grant execute on function draft_years() to authenticated;
grant execute on function draft_class(int) to anon;
grant execute on function draft_class(int) to authenticated;
