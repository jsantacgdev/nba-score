-- ============================================
-- search_players: relevancia por puntos, no por partidos
-- ============================================
-- El desempate por partidos de carrera medía longevidad, no relevancia:
-- DeAndre Jordan (1144 partidos, ~9000 puntos) le ganaba a Michael Jordan
-- (1072 partidos, 32000 puntos) al buscar "jordan".
--
-- Los puntos totales separan mucho mejor a una leyenda de un jugador de
-- rotacion largo. Se calculan como media por partido x partidos, que es
-- lo unico reconstruible desde player_season_history.

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
  left join (
    select
      h.player_id,
      sum(h.points * h.games_played) as career_points
    from player_season_history h
    group by h.player_id
  ) cp on cp.player_id = p.id
  where
    p.first_name ilike '%' || query || '%'
    or p.last_name ilike '%' || query || '%'
    or (p.first_name || ' ' || p.last_name) ilike '%' || query || '%'
  order by
    case
      when lower(p.first_name || ' ' || p.last_name) = lower(query) then 0
      when lower(p.last_name) = lower(query) then 1
      when p.last_name ilike query || '%' then 2
      when p.first_name ilike query || '%' then 3
      else 4
    end,
    coalesce(cp.career_points, 0) desc,
    p.is_active desc,
    p.last_name
  limit max_results;
$$;

grant execute on function search_players(text, int) to anon;
grant execute on function search_players(text, int) to authenticated;
