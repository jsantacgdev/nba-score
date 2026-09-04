-- ============================================
-- player_career: no perder temporadas sin ficha de plantilla
-- ============================================
-- La funcion se construia solo desde player_season_teams, que sale de las
-- plantillas a final de temporada. Un jugador que paso por dos equipos con
-- contratos cortos y no acabo en ninguno no tiene ninguna ficha, y para
-- esos la NBA tampoco publica PlayerCareerStats (responde {} vacio).
--
-- Resultado: su pestaña de carrera salia vacia aunque si tuvieramos sus
-- medias de temporada. Aqui se añaden esas temporadas usando el equipo con
-- el que consta en el historico.

create or replace function player_career(target_player_id text)
returns table (
  season text,
  team_id text,
  team_name text,
  team_abbreviation text,
  team_logo_url text,
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
  team_count int,
  won_championship boolean
)
language sql
stable
as $$
  select * from (
    -- Fichas de plantilla, con el desglose por equipo cuando esta cargado
    select
      pst.season as season,
      pst.team_id as team_id,
      t.name as team_name,
      t.abbreviation as team_abbreviation,
      t.logo_url as team_logo_url,
      coalesce(pst.games_played, psh.games_played) as games_played,
      coalesce(pst.minutes, psh.minutes) as minutes,
      coalesce(pst.points, psh.points) as points,
      coalesce(pst.rebounds, psh.rebounds) as rebounds,
      coalesce(pst.assists, psh.assists) as assists,
      coalesce(pst.steals, psh.steals) as steals,
      coalesce(pst.blocks, psh.blocks) as blocks,
      coalesce(pst.turnovers, psh.turnovers) as turnovers,
      coalesce(pst.field_goal_pct, psh.field_goal_pct) as field_goal_pct,
      coalesce(pst.three_point_pct, psh.three_point_pct) as three_point_pct,
      coalesce(pst.free_throw_pct, psh.free_throw_pct) as free_throw_pct,
      coalesce(psh.team_count, 1) as team_count,
      coalesce(psh.won_championship and sc.team_id = pst.team_id, false)
        as won_championship
    from player_season_teams pst
    join teams t on t.id = pst.team_id
    left join player_season_history psh
      on psh.player_id = pst.player_id
     and psh.season = pst.season
    left join season_champions sc
      on sc.season = pst.season
    where pst.player_id = target_player_id

    union all

    -- Temporadas con estadisticas pero sin ninguna ficha de plantilla
    select
      psh.season,
      psh.primary_team_id,
      t.name,
      t.abbreviation,
      t.logo_url,
      psh.games_played,
      psh.minutes,
      psh.points,
      psh.rebounds,
      psh.assists,
      psh.steals,
      psh.blocks,
      psh.turnovers,
      psh.field_goal_pct,
      psh.three_point_pct,
      psh.free_throw_pct,
      coalesce(psh.team_count, 1),
      coalesce(psh.won_championship and sc.team_id = psh.primary_team_id, false)
    from player_season_history psh
    join teams t on t.id = psh.primary_team_id
    left join season_champions sc
      on sc.season = psh.season
    where psh.player_id = target_player_id
      and not exists (
        select 1
        from player_season_teams x
        where x.player_id = psh.player_id
          and x.season = psh.season
      )
  ) carrera
  order by season desc, coalesce(games_played, 0) desc;
$$;

grant execute on function player_career(text) to anon;
grant execute on function player_career(text) to authenticated;
