-- ============================================
-- Palmares de equipo: campeonatos NBA y NBA Cup
-- ============================================
-- season_champions solo guardaba el campeon de la NBA y solo desde
-- 1983-84, que es donde empiezan los datos de la API. Ahora guarda
-- tambien los titulos historicos (1947-1983, cargados a mano y
-- contrastados uno a uno contra el recuento oficial de FranchiseHistory)
-- y los de la NBA Cup, que es otra competicion.
--
-- Por eso la clave pasa a ser (temporada, competicion): un equipo puede
-- ganar las dos en el mismo ano, como los Knicks en 2025-26.

alter table season_champions
  add column competition text not null default 'nba';

alter table season_champions
  add constraint season_champions_competition_check
  check (competition in ('nba', 'nba_cup'));

alter table season_champions drop constraint season_champions_pkey;
alter table season_champions add primary key (season, competition);

-- El campeon de 1947-48 fueron los Baltimore Bullets, franquicia disuelta
-- en 1954 y sin heredero actual (los Wizards son otra distinta pese al
-- nombre). Se guarda con equipo nulo para no perder el dato historico.
alter table season_champions alter column team_id drop not null;

create index idx_champions_team on season_champions(team_id, season desc);

-- ============================================
-- Las funciones que cruzan con season_champions tienen que acotar a la
-- NBA: sin el filtro, una temporada con Copa y anillo devolveria la fila
-- por duplicado y marcaria campeon a quien solo gano la Copa.
-- ============================================

create or replace function team_seasons(target_team_id text)
returns table (
  season text,
  players int,
  won_championship boolean
)
language sql
stable
as $$
  select
    pst.season,
    count(*)::int as players,
    coalesce(bool_or(sc.team_id = pst.team_id), false) as won_championship
  from player_season_teams pst
  left join season_champions sc
    on sc.season = pst.season
   and sc.competition = 'nba'
  where pst.team_id = target_team_id
  group by pst.season
  order by pst.season desc;
$$;

create or replace function team_season_roster(
  target_team_id text,
  target_season text
)
returns table (
  player_id text,
  first_name text,
  last_name text,
  photo_url text,
  jersey_number text,
  player_position text,
  games_played int,
  minutes numeric,
  points numeric,
  rebounds numeric,
  assists numeric,
  steals numeric,
  blocks numeric,
  field_goal_pct numeric,
  three_point_pct numeric,
  free_throw_pct numeric,
  won_championship boolean
)
language sql
stable
as $$
  select
    p.id as player_id,
    p.first_name,
    p.last_name,
    p.photo_url,
    pst.jersey_number,
    pst.position as player_position,
    coalesce(pst.games_played, psh.games_played) as games_played,
    coalesce(pst.minutes, psh.minutes) as minutes,
    coalesce(pst.points, psh.points) as points,
    coalesce(pst.rebounds, psh.rebounds) as rebounds,
    coalesce(pst.assists, psh.assists) as assists,
    coalesce(pst.steals, psh.steals) as steals,
    coalesce(pst.blocks, psh.blocks) as blocks,
    coalesce(pst.field_goal_pct, psh.field_goal_pct) as field_goal_pct,
    coalesce(pst.three_point_pct, psh.three_point_pct) as three_point_pct,
    coalesce(pst.free_throw_pct, psh.free_throw_pct) as free_throw_pct,
    coalesce(sc.team_id = pst.team_id, false) as won_championship
  from player_season_teams pst
  join players p on p.id = pst.player_id
  left join player_season_history psh
    on psh.player_id = pst.player_id
   and psh.season = pst.season
  left join season_champions sc
    on sc.season = pst.season
   and sc.competition = 'nba'
  where pst.team_id = target_team_id
    and pst.season = target_season
  order by coalesce(pst.points, psh.points, 0) desc, p.last_name;
$$;

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
     and sc.competition = 'nba'
    where pst.player_id = target_player_id

    union all

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
     and sc.competition = 'nba'
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

-- ============================================
-- Palmares de un equipo: una fila por titulo
-- ============================================
-- Devuelve el detalle en lugar de un recuento para que la app pueda
-- agrupar y listar los anos, que es como se lee un palmares.
create or replace function team_palmares(target_team_id text)
returns table (
  competition text,
  season text,
  year int
)
language sql
stable
as $$
  select
    sc.competition,
    sc.season,
    (split_part(sc.season, '-', 1))::int + 1 as year
  from season_champions sc
  where sc.team_id = target_team_id
  order by sc.competition, sc.season desc;
$$;

grant execute on function team_palmares(text) to anon;
grant execute on function team_palmares(text) to authenticated;
