-- ============================================
-- Lideres: todas las medias, ordenadas por el campo elegido
-- ============================================
-- Cambia respecto a la version anterior en dos cosas:
--
--   * Devuelve todas las medias de la temporada, no solo aquella por la
--     que se ordena, porque la ficha de cada jugador las muestra juntas.
--
--   * Se quita el minimo de partidos. Salen todos los jugadores con
--     registro esa temporada, y cada fila dice cuantos partidos jugo,
--     que es el dato con el que se interpreta la media.

drop function if exists season_leaders(text, text, int);

create or replace function season_leaders(
  target_season text,
  target_stat text default 'points',
  target_limit int default 100
)
returns table (
  puesto int,
  player_id text,
  player_name text,
  photo_url text,
  team_id text,
  team_abbreviation text,
  team_logo_url text,
  games_played int,
  minutes numeric,
  points numeric,
  rebounds numeric,
  assists numeric,
  steals numeric,
  blocks numeric
)
language sql
stable
as $$
  with base as (
    select
      h.player_id,
      h.games_played,
      h.minutes,
      h.points,
      h.rebounds,
      h.assists,
      h.steals,
      h.blocks,
      h.primary_team_id,
      case target_stat
        when 'points'   then h.points
        when 'rebounds' then h.rebounds
        when 'assists'  then h.assists
        when 'steals'   then h.steals
        when 'blocks'   then h.blocks
        when 'minutes'  then h.minutes
        else h.points
      end as orden
    from player_season_history h
    where h.season = target_season
  )
  select
    row_number() over (order by b.orden desc nulls last, b.games_played desc)::int as puesto,
    b.player_id,
    trim(p.first_name || ' ' || p.last_name) as player_name,
    p.photo_url,
    t.id as team_id,
    t.abbreviation as team_abbreviation,
    t.logo_url as team_logo_url,
    b.games_played,
    b.minutes,
    b.points,
    b.rebounds,
    b.assists,
    b.steals,
    b.blocks
  from base b
  join players p on p.id = b.player_id
  left join teams t on t.id = b.primary_team_id
  where b.orden is not null
  order by b.orden desc nulls last, b.games_played desc
  limit target_limit;
$$;

grant execute on function season_leaders(text, text, int) to anon;
grant execute on function season_leaders(text, text, int) to authenticated;
