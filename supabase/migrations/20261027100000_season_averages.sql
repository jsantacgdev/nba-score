create or replace function refresh_season_averages(target_season text)
returns int
language plpgsql
as $$
declare
  jugadores int;
begin
  with lineas as (
    select
      l.player_id,
      coalesce(
        gs.team_id,
        (
          select max(x.team_id)
          from player_season_teams x
          where x.player_id = l.player_id
            and x.season = target_season
            and x.team_id in (g.home_team_id, g.away_team_id)
          having count(*) = 1
        ),
        case when p.team_id in (g.home_team_id, g.away_team_id) then p.team_id end
      ) as team_id,
      p.team_id as team_actual,
      l.minutes,
      l.points,
      l.rebounds,
      l.assists,
      l.steals,
      l.blocks,
      l.turnovers,
      l.fg_made,
      l.fg_attempted,
      l.fg3_made,
      l.fg3_attempted,
      l.ft_made,
      l.ft_attempted
    from player_game_log l
    join games g on g.id = l.game_id
    join players p on p.id = l.player_id
    left join game_starters gs
      on gs.game_id = l.game_id
     and gs.player_id = l.player_id
    where l.season = target_season
      and g.season_type = 'regular'
      and g.status = 'final'
  ),
  por_equipo as (
    insert into player_season_teams (
      player_id, season, team_id, games_played, minutes, points, rebounds,
      assists, steals, blocks, turnovers, field_goal_pct, three_point_pct,
      free_throw_pct, updated_at
    )
    select
      t.player_id,
      target_season,
      t.team_id,
      count(*)::int,
      round(avg(t.minutes), 1),
      round(avg(t.points), 1),
      round(avg(t.rebounds), 1),
      round(avg(t.assists), 1),
      round(avg(t.steals), 1),
      round(avg(t.blocks), 1),
      round(avg(t.turnovers), 1),
      coalesce(round(sum(t.fg_made)::numeric / nullif(sum(t.fg_attempted), 0), 3), 0),
      coalesce(round(sum(t.fg3_made)::numeric / nullif(sum(t.fg3_attempted), 0), 3), 0),
      coalesce(round(sum(t.ft_made)::numeric / nullif(sum(t.ft_attempted), 0), 3), 0),
      now()
    from lineas t
    where t.team_id is not null
    group by t.player_id, t.team_id
    on conflict (player_id, season, team_id) do update set
      games_played = excluded.games_played,
      minutes = excluded.minutes,
      points = excluded.points,
      rebounds = excluded.rebounds,
      assists = excluded.assists,
      steals = excluded.steals,
      blocks = excluded.blocks,
      turnovers = excluded.turnovers,
      field_goal_pct = excluded.field_goal_pct,
      three_point_pct = excluded.three_point_pct,
      free_throw_pct = excluded.free_throw_pct,
      updated_at = now()
    where (
        player_season_teams.games_played,
        player_season_teams.minutes,
        player_season_teams.points,
        player_season_teams.rebounds,
        player_season_teams.assists,
        player_season_teams.steals,
        player_season_teams.blocks,
        player_season_teams.turnovers,
        player_season_teams.field_goal_pct,
        player_season_teams.three_point_pct,
        player_season_teams.free_throw_pct
      ) is distinct from (
        excluded.games_played,
        excluded.minutes,
        excluded.points,
        excluded.rebounds,
        excluded.assists,
        excluded.steals,
        excluded.blocks,
        excluded.turnovers,
        excluded.field_goal_pct,
        excluded.three_point_pct,
        excluded.free_throw_pct
      )
    returning player_id
  ),
  por_jugador as (
    insert into player_season_history (
      player_id, season, primary_team_id, team_count, games_played, minutes,
      points, rebounds, assists, steals, blocks, turnovers, field_goal_pct,
      three_point_pct, free_throw_pct, updated_at
    )
    select
      t.player_id,
      target_season,
      coalesce(
        (
          select principal.team_id
          from lineas principal
          where principal.player_id = t.player_id
            and principal.team_id is not null
          group by principal.team_id
          order by count(*) desc, principal.team_id
          limit 1
        ),
        max(t.team_actual)
      ),
      greatest(count(distinct t.team_id), 1)::int,
      count(*)::int,
      round(avg(t.minutes), 1),
      round(avg(t.points), 1),
      round(avg(t.rebounds), 1),
      round(avg(t.assists), 1),
      round(avg(t.steals), 1),
      round(avg(t.blocks), 1),
      round(avg(t.turnovers), 1),
      coalesce(round(sum(t.fg_made)::numeric / nullif(sum(t.fg_attempted), 0), 3), 0),
      coalesce(round(sum(t.fg3_made)::numeric / nullif(sum(t.fg3_attempted), 0), 3), 0),
      coalesce(round(sum(t.ft_made)::numeric / nullif(sum(t.ft_attempted), 0), 3), 0),
      now()
    from lineas t
    group by t.player_id
    on conflict (player_id, season) do update set
      primary_team_id = excluded.primary_team_id,
      team_count = excluded.team_count,
      games_played = excluded.games_played,
      minutes = excluded.minutes,
      points = excluded.points,
      rebounds = excluded.rebounds,
      assists = excluded.assists,
      steals = excluded.steals,
      blocks = excluded.blocks,
      turnovers = excluded.turnovers,
      field_goal_pct = excluded.field_goal_pct,
      three_point_pct = excluded.three_point_pct,
      free_throw_pct = excluded.free_throw_pct,
      updated_at = now()
    where (
        player_season_history.primary_team_id,
        player_season_history.team_count,
        player_season_history.games_played,
        player_season_history.minutes,
        player_season_history.points,
        player_season_history.rebounds,
        player_season_history.assists,
        player_season_history.steals,
        player_season_history.blocks,
        player_season_history.turnovers,
        player_season_history.field_goal_pct,
        player_season_history.three_point_pct,
        player_season_history.free_throw_pct
      ) is distinct from (
        excluded.primary_team_id,
        excluded.team_count,
        excluded.games_played,
        excluded.minutes,
        excluded.points,
        excluded.rebounds,
        excluded.assists,
        excluded.steals,
        excluded.blocks,
        excluded.turnovers,
        excluded.field_goal_pct,
        excluded.three_point_pct,
        excluded.free_throw_pct
      )
    returning player_id
  )
  select count(*)::int into jugadores from por_jugador;

  return jugadores;
end;
$$;

grant execute on function refresh_season_averages(text) to service_role;
