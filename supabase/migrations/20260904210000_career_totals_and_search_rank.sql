-- ============================================
-- Medias de carrera y buscador ordenado por relevancia
-- ============================================

-- Medias de toda la carrera, ponderadas por partidos jugados.
--
-- Ojo: los porcentajes se ponderan tambien por partidos, no por intentos,
-- porque player_season_history guarda medias y no acumulados. Es una
-- aproximacion muy buena para comparar, pero no es el porcentaje oficial
-- de carrera al tercer decimal.
create or replace function player_career_totals(target_player_id text)
returns table (
  player_id text,
  seasons int,
  games_played int,
  minutes numeric,
  points numeric,
  rebounds numeric,
  assists numeric,
  steals numeric,
  blocks numeric,
  turnovers numeric,
  field_goal_pct numeric,
  three_point_pct numeric,
  free_throw_pct numeric,
  championships int,
  first_season text,
  last_season text
)
language sql
stable
as $$
  select
    target_player_id as player_id,
    count(*)::int as seasons,
    sum(h.games_played)::int as games_played,
    round(sum(h.minutes * h.games_played) / nullif(sum(h.games_played), 0), 1) as minutes,
    round(sum(h.points * h.games_played) / nullif(sum(h.games_played), 0), 1) as points,
    round(sum(h.rebounds * h.games_played) / nullif(sum(h.games_played), 0), 1) as rebounds,
    round(sum(h.assists * h.games_played) / nullif(sum(h.games_played), 0), 1) as assists,
    round(sum(h.steals * h.games_played) / nullif(sum(h.games_played), 0), 1) as steals,
    round(sum(h.blocks * h.games_played) / nullif(sum(h.games_played), 0), 1) as blocks,
    round(sum(h.turnovers * h.games_played) / nullif(sum(h.games_played), 0), 1) as turnovers,
    round(sum(h.field_goal_pct * h.games_played) / nullif(sum(h.games_played), 0), 3)
      as field_goal_pct,
    round(sum(h.three_point_pct * h.games_played) / nullif(sum(h.games_played), 0), 3)
      as three_point_pct,
    round(sum(h.free_throw_pct * h.games_played) / nullif(sum(h.games_played), 0), 3)
      as free_throw_pct,
    count(*) filter (where h.won_championship)::int as championships,
    min(h.season) as first_season,
    max(h.season) as last_season
  from player_season_history h
  where h.player_id = target_player_id
    and h.games_played > 0;
$$;

-- ============================================
-- search_players: relevancia antes que actividad
-- ============================================
-- Ordenaba por is_active primero, asi que cualquier jugador en activo
-- ganaba a cualquier retirado. Con 2000 historicos en la tabla, buscar
-- "kobe" devolvia tres Kobes en activo antes que Kobe Bryant.
--
-- Ahora manda la calidad de la coincidencia y, a igualdad, los partidos
-- de carrera: una leyenda pesa mas que un jugador de rotacion.
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
    select h.player_id, sum(h.games_played) as career_games
    from player_season_history h
    group by h.player_id
  ) cg on cg.player_id = p.id
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
    coalesce(cg.career_games, 0) desc,
    p.is_active desc,
    p.last_name
  limit max_results;
$$;

grant execute on function player_career_totals(text) to anon;
grant execute on function player_career_totals(text) to authenticated;
grant execute on function search_players(text, int) to anon;
grant execute on function search_players(text, int) to authenticated;
