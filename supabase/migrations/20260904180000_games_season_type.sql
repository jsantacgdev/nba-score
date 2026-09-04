-- ============================================
-- games.season_type: distinguir el tipo de partido
-- ============================================
-- La clasificacion excluia la pretemporada por el prefijo del ID
-- ('001%'), pero seguia sumando playoffs (004) y play-in (005), asi que
-- los balances salian inflados: 96 partidos jugados en vez de 82.
--
-- No vale con filtrar 'id like 002%' porque los partidos que trae
-- balldontlie llevan IDs 'bdl_*' y se quedarian fuera, y durante la
-- temporada son la unica fuente hasta que se ejecuta el sync local.
-- Guardamos el tipo como dato y filtramos por el.

alter table games add column season_type text not null default 'regular';

-- Backfill de lo ya cargado a partir del prefijo del ID de la NBA.
-- Los 'bdl_*' se quedan en 'regular': balldontlie no publica
-- pretemporada, y los de playoffs los marcara el cliente al insertarlos.
update games set season_type = case
  when id like '001%' then 'preseason'
  when id like '002%' then 'regular'
  when id like '003%' then 'allstar'
  when id like '004%' then 'playoffs'
  when id like '005%' then 'playin'
  else 'regular'
end;

alter table games add constraint games_season_type_check
  check (season_type in ('preseason', 'regular', 'allstar', 'playoffs', 'playin'));

create index idx_games_season_type on games(season, season_type) where status = 'final';

-- ============================================
-- league_standings sobre temporada regular y temporada en curso
-- ============================================
create or replace view league_standings as
with current_season as (
  select max(season) as season
  from games
  where status = 'final'
    and season_type = 'regular'
),
team_results as (
  select
    home_team_id as team_id,
    case when score_home > score_away then 1 else 0 end as win,
    case when score_home < score_away then 1 else 0 end as loss,
    score_home as points_for,
    score_away as points_against
  from games
  where status = 'final'
    and season_type = 'regular'
    and season = (select season from current_season)

  union all

  select
    away_team_id as team_id,
    case when score_away > score_home then 1 else 0 end as win,
    case when score_away < score_home then 1 else 0 end as loss,
    score_away as points_for,
    score_home as points_against
  from games
  where status = 'final'
    and season_type = 'regular'
    and season = (select season from current_season)
)
select
  t.id as team_id,
  t.name,
  t.full_name,
  t.abbreviation,
  t.city,
  t.conference,
  t.division,
  t.logo_url,
  sum(r.win) as wins,
  sum(r.loss) as losses,
  count(*) as games_played,
  case
    when count(*) > 0 then round(sum(r.win)::numeric / count(*), 3)
    else 0
  end as win_percentage,
  sum(r.points_for) as total_points_for,
  sum(r.points_against) as total_points_against,
  case
    when count(*) > 0 then round((sum(r.points_for) - sum(r.points_against))::numeric / count(*), 1)
    else 0
  end as point_differential,
  (select season from current_season) as season
from teams t
left join team_results r on r.team_id = t.id
group by t.id, t.name, t.full_name, t.abbreviation, t.city, t.conference, t.division, t.logo_url;

grant select on league_standings to anon;
grant select on league_standings to authenticated;
