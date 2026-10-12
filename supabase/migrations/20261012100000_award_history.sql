create or replace function award_history(target_award text)
returns table (
  season text,
  player_id text,
  player_name text,
  photo_url text,
  team_id text,
  team_name text,
  team_abbreviation text,
  team_logo_url text
)
language sql
stable
as $$
  select
    sc.season,
    null::text as player_id,
    null::text as player_name,
    null::text as photo_url,
    t.id as team_id,
    t.full_name as team_name,
    t.abbreviation as team_abbreviation,
    t.logo_url as team_logo_url
  from season_champions sc
  join teams t on t.id = sc.team_id
  where target_award in ('champion', 'nba_cup')
    and sc.competition = case when target_award = 'champion' then 'nba' else 'nba_cup' end

  union all

  select
    pa.season,
    pa.player_id,
    nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
    p.photo_url,
    t.id,
    coalesce(t.full_name, pa.team_name),
    t.abbreviation,
    t.logo_url
  from player_awards pa
  left join players p on p.id = pa.player_id
  left join teams t on t.full_name = pa.team_name
  where target_award not in ('champion', 'nba_cup')
    and pa.award = target_award

  order by 1 desc;
$$;

grant execute on function award_history(text) to anon, authenticated;
