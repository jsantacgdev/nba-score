create or replace function player_career_highs(target_player_id text)
returns table (
  stat text,
  valor int,
  game_id text,
  game_date timestamptz,
  season text,
  opponent_abbreviation text,
  season_type text
)
language sql
stable
as $$
  with registros as (
    select
      l.game_id,
      l.game_date,
      l.season,
      l.points,
      l.rebounds,
      l.assists,
      l.steals,
      l.blocks,
      g.season_type,
      case
        when g.home_team_id = h.primary_team_id then va.abbreviation
        else lo.abbreviation
      end as rival
    from player_game_log l
    left join games g on g.id = l.game_id
    left join player_season_history h
      on h.player_id = l.player_id and h.season = l.season
    left join teams lo on lo.id = g.home_team_id
    left join teams va on va.id = g.away_team_id
    where l.player_id = target_player_id
      and coalesce(g.season_type, 'regular') <> 'preseason'
  ),
  mejores as (
    (select 'points'   as stat, points   as valor, game_id, game_date, season, rival, season_type
       from registros where points   is not null order by points   desc, game_date desc limit 1)
    union all
    (select 'rebounds', rebounds, game_id, game_date, season, rival, season_type
       from registros where rebounds is not null order by rebounds desc, game_date desc limit 1)
    union all
    (select 'assists', assists, game_id, game_date, season, rival, season_type
       from registros where assists  is not null order by assists  desc, game_date desc limit 1)
    union all
    (select 'steals', steals, game_id, game_date, season, rival, season_type
       from registros where steals   is not null order by steals   desc, game_date desc limit 1)
    union all
    (select 'blocks', blocks, game_id, game_date, season, rival, season_type
       from registros where blocks   is not null order by blocks   desc, game_date desc limit 1)
  )
  select stat, valor, game_id, game_date, season, rival, season_type
  from mejores
  where valor > 0;
$$;

grant execute on function player_career_highs(text) to anon, authenticated;
