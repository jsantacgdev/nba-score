-- ============================================
-- Lideres de la liga por temporada
-- ============================================
-- Ordena a los jugadores por una media de la temporada elegida.
--
-- El minimo de partidos no es un capricho: sin el, cualquiera que juegue
-- tres partidos acertados encabeza la lista. La NBA exige 58 de 82 para
-- optar al titulo de anotador, asi que se aplica esa misma proporcion
-- (algo mas del 70%) y se escala a la longitud real de cada temporada,
-- que no siempre es 82: fueron 50 en 1998-99, 66 en 2011-12 y 72 en
-- 2020-21.
--
-- La longitud sale de la tabla games y no del maximo de partidos jugados,
-- porque un jugador traspasado puede acumular 83 en una temporada de 82.
--
-- Solo se admiten medias donde el minimo de partidos basta como filtro.
-- Los porcentajes de tiro se quedan fuera a proposito: para que fueran
-- justos harian falta los intentos, y player_season_history solo guarda
-- el porcentaje ya calculado.

create or replace function season_leaders(
  target_season text,
  target_stat text default 'points',
  target_limit int default 30
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
  valor numeric
)
language sql
stable
as $$
  with longitud as (
    -- Partidos por equipo en esa temporada
    select coalesce(
      round(count(*) * 2.0 / nullif(count(distinct g.home_team_id), 0)),
      82
    ) as partidos
    from games g
    where g.season = target_season
      and g.season_type = 'regular'
  ),
  minimo as (
    select greatest(round((select partidos from longitud) * 58.0 / 82.0), 1) as pj
  ),
  elegibles as (
    select
      h.player_id,
      h.games_played,
      case target_stat
        when 'points'   then h.points
        when 'rebounds' then h.rebounds
        when 'assists'  then h.assists
        when 'steals'   then h.steals
        when 'blocks'   then h.blocks
        when 'minutes'  then h.minutes
        else h.points
      end as valor
    from player_season_history h
    where h.season = target_season
      and h.games_played >= (select pj from minimo)
  )
  select
    row_number() over (order by e.valor desc nulls last, e.games_played desc)::int as puesto,
    e.player_id,
    trim(p.first_name || ' ' || p.last_name) as player_name,
    p.photo_url,
    t.id as team_id,
    t.abbreviation as team_abbreviation,
    t.logo_url as team_logo_url,
    e.games_played,
    e.valor
  from elegibles e
  join players p on p.id = e.player_id
  left join player_season_history h2
    on h2.player_id = e.player_id and h2.season = target_season
  left join teams t on t.id = h2.primary_team_id
  where e.valor is not null
  order by e.valor desc nulls last, e.games_played desc
  limit target_limit;
$$;

grant execute on function season_leaders(text, text, int) to anon;
grant execute on function season_leaders(text, text, int) to authenticated;
