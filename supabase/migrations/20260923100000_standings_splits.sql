drop function if exists season_standings(text);

create or replace function season_standings(target_season text)
returns table (
  team_id text,
  name text,
  full_name text,
  abbreviation text,
  city text,
  conference text,
  division text,
  logo_url text,
  wins int,
  losses int,
  games_played int,
  win_percentage numeric,
  point_differential numeric,
  won_championship boolean,
  home_wins int,
  home_losses int,
  away_wins int,
  away_losses int,
  streak int,
  last10_wins int,
  last10_losses int
)
language sql
stable
as $$
  with participantes as (
    select distinct home_team_id as team_id
    from games
    where season = target_season and season_type = 'regular'
    union
    select distinct away_team_id
    from games
    where season = target_season and season_type = 'regular'
  ),
  team_results as (
    select
      home_team_id as team_id,
      true as en_casa,
      starts_at,
      case when score_home > score_away then 1 else 0 end as win,
      case when score_home < score_away then 1 else 0 end as loss,
      score_home as points_for,
      score_away as points_against
    from games
    where status = 'final'
      and season_type = 'regular'
      and season = target_season

    union all

    select
      away_team_id as team_id,
      false as en_casa,
      starts_at,
      case when score_away > score_home then 1 else 0 end as win,
      case when score_away < score_home then 1 else 0 end as loss,
      score_away as points_for,
      score_home as points_against
    from games
    where status = 'final'
      and season_type = 'regular'
      and season = target_season
  ),
  balance as (
    select
      r.team_id,
      sum(r.win)::int as wins,
      sum(r.loss)::int as losses,
      count(*)::int as games_played,
      round(sum(r.win)::numeric / count(*), 3) as win_percentage,
      round(
        (sum(r.points_for) - sum(r.points_against))::numeric / count(*), 1
      ) as point_differential,
      count(*) filter (where r.en_casa and r.win = 1)::int as home_wins,
      count(*) filter (where r.en_casa and r.loss = 1)::int as home_losses,
      count(*) filter (where not r.en_casa and r.win = 1)::int as away_wins,
      count(*) filter (where not r.en_casa and r.loss = 1)::int as away_losses
    from team_results r
    group by r.team_id
  ),
  ordenados as (
    select
      r.team_id,
      r.win,
      row_number() over (partition by r.team_id order by r.starts_at desc) as rn
    from team_results r
  ),
  ultimos as (
    select
      o.team_id,
      count(*) filter (where o.win = 1)::int as last10_wins,
      count(*) filter (where o.win = 0)::int as last10_losses
    from ordenados o
    where o.rn <= 10
    group by o.team_id
  ),
  racha as (
    select
      o.team_id,
      (
        select count(*)
        from ordenados o2
        where o2.team_id = o.team_id
          and o2.rn < coalesce(
            (
              select min(o3.rn)
              from ordenados o3
              where o3.team_id = o.team_id
                and o3.win <> o.win
            ),
            2147483647
          )
      )::int * case when o.win = 1 then 1 else -1 end as streak
    from ordenados o
    where o.rn = 1
  ),
  campeon as (
    select team_id
    from season_champions
    where season = target_season
      and competition = 'nba'
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
    coalesce(b.wins, 0) as wins,
    coalesce(b.losses, 0) as losses,
    coalesce(b.games_played, 0) as games_played,
    coalesce(b.win_percentage, 0) as win_percentage,
    coalesce(b.point_differential, 0) as point_differential,
    coalesce(c.team_id = t.id, false) as won_championship,
    coalesce(b.home_wins, 0) as home_wins,
    coalesce(b.home_losses, 0) as home_losses,
    coalesce(b.away_wins, 0) as away_wins,
    coalesce(b.away_losses, 0) as away_losses,
    coalesce(ra.streak, 0) as streak,
    coalesce(u.last10_wins, 0) as last10_wins,
    coalesce(u.last10_losses, 0) as last10_losses
  from teams t
  join participantes p on p.team_id = t.id
  left join balance b on b.team_id = t.id
  left join ultimos u on u.team_id = t.id
  left join racha ra on ra.team_id = t.id
  left join campeon c on true
  order by
    coalesce(b.win_percentage, 0) desc,
    coalesce(b.wins, 0) desc,
    t.name;
$$;

grant execute on function season_standings(text) to anon;
grant execute on function season_standings(text) to authenticated;
