-- ============================================
-- standings_seasons: devolver tambien el campeon
-- ============================================
-- El selector de temporadas de la clasificacion mostraba solo el ano.
-- Añadiendo el campeon, la lista pasa a ser un repaso de la historia de
-- la liga en vez de un desplegable de fechas.
--
-- El filtro por competicion no es opcional: sin el, una temporada con
-- anillo y NBA Cup devolveria dos filas y el ano saldria duplicado en la
-- lista. Ya paso con season_standings.

drop function if exists standings_seasons();

create or replace function standings_seasons()
returns table (
  season text,
  games_count int,
  champion_team_id text,
  champion_name text,
  champion_abbreviation text,
  champion_logo_url text
)
language sql
stable
as $$
  with temporadas as (
    select
      g.season,
      count(*)::int as games_count
    from games g
    where g.status = 'final'
      and g.season_type = 'regular'
    group by g.season
  )
  select
    s.season,
    s.games_count,
    c.team_id as champion_team_id,
    t.name as champion_name,
    t.abbreviation as champion_abbreviation,
    t.logo_url as champion_logo_url
  from temporadas s
  left join season_champions c
    on c.season = s.season
   and c.competition = 'nba'
  left join teams t on t.id = c.team_id
  order by s.season desc;
$$;

grant execute on function standings_seasons() to anon;
grant execute on function standings_seasons() to authenticated;
