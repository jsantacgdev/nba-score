-- ============================================
-- league_standings: acotar a la temporada en curso
-- ============================================
-- La vista original sumaba TODOS los partidos finalizados de la tabla,
-- sin mirar la temporada. Mientras solo hubo una temporada cargada no se
-- noto, pero en cuanto se juegue el primer partido de la siguiente la
-- clasificacion empezaria a arrastrar las victorias de la anterior.
--
-- "Temporada en curso" = la mas reciente que tenga partidos finalizados,
-- no la mas reciente a secas: durante el verano la tabla ya contiene el
-- calendario de la temporada que viene, y sin ese matiz la clasificacion
-- se quedaria a cero hasta la noche inaugural.

create or replace view league_standings as
with current_season as (
  select max(season) as season
  from games
  where status = 'final'
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
    and id not like '001%'  -- excluir pretemporada
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
    and id not like '001%'
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
