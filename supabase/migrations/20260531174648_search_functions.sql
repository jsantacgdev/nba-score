-- Función para buscar jugadores por nombre (parcial, case-insensitive)
create or replace function search_players(query text, max_results int default 20)
returns table (
  id text,
  first_name text,
  last_name text,
  full_name text,
  team_id text,
  team_name text,
  team_abbreviation text,
  team_logo_url text,
  player_position text,
  photo_url text,
  is_active boolean
)
language sql
stable
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.first_name || ' ' || p.last_name as full_name,
    p.team_id,
    t.name as team_name,
    t.abbreviation as team_abbreviation,
    t.logo_url as team_logo_url,
    p.position as player_position,
    p.photo_url,
    p.is_active
  from players p
  left join teams t on t.id = p.team_id
  where
    p.first_name ilike '%' || query || '%'
    or p.last_name ilike '%' || query || '%'
    or (p.first_name || ' ' || p.last_name) ilike '%' || query || '%'
  order by
    p.is_active desc,
    case when p.last_name ilike query || '%' then 0 else 1 end,
    p.last_name
  limit max_results;
$$;

-- Función para buscar equipos por nombre, ciudad o abreviatura
create or replace function search_teams(query text, max_results int default 10)
returns table (
  id text,
  name text,
  full_name text,
  abbreviation text,
  city text,
  conference text,
  logo_url text
)
language sql
stable
as $$
  select
    t.id,
    t.name,
    t.full_name,
    t.abbreviation,
    t.city,
    t.conference,
    t.logo_url
  from teams t
  where
    t.name ilike '%' || query || '%'
    or t.full_name ilike '%' || query || '%'
    or t.city ilike '%' || query || '%'
    or t.abbreviation ilike query || '%'
  order by
    case when lower(t.abbreviation) = lower(query) then 0 else 1 end,
    case when t.name ilike query || '%' then 0 else 1 end,
    t.name
  limit max_results;
$$;

grant execute on function search_players(text, int) to anon;
grant execute on function search_players(text, int) to authenticated;
grant execute on function search_teams(text, int) to anon;
grant execute on function search_teams(text, int) to authenticated;