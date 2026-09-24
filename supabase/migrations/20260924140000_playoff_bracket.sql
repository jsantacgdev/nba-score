create or replace function playoff_bracket(target_season text)
returns table (
  ronda int,
  conferencia text,
  orden int,
  team_a_id text,
  team_a_name text,
  team_a_abbreviation text,
  team_a_logo_url text,
  wins_a int,
  team_b_id text,
  team_b_name text,
  team_b_abbreviation text,
  team_b_logo_url text,
  wins_b int,
  decidida boolean,
  campeon boolean
)
language sql
stable
as $$
  with playoffs as (
    select
      g.id,
      g.starts_at,
      least(g.home_team_id, g.away_team_id) as team_low,
      greatest(g.home_team_id, g.away_team_id) as team_high,
      case
        when g.score_home > g.score_away then g.home_team_id
        else g.away_team_id
      end as winner
    from games g
    where g.season = target_season
      and g.season_type = 'playoffs'
      and g.status = 'final'
  ),
  series as (
    select
      p.team_low,
      p.team_high,
      count(*) filter (where p.winner = p.team_low)::int as wins_low,
      count(*) filter (where p.winner = p.team_high)::int as wins_high,
      count(*)::int as partidos,
      min(p.starts_at) as primero
    from playoffs p
    group by p.team_low, p.team_high
  ),
  ordenadas as (
    select
      s.*,
      row_number() over (order by s.primero, s.team_low, s.team_high) as posicion
    from series s
  ),
  con_ronda as (
    select
      o.*,
      case
        when o.posicion <= 8 then 1
        when o.posicion <= 12 then 2
        when o.posicion <= 14 then 3
        else 4
      end as ronda,
      greatest(o.wins_low, o.wins_high) as mejor
    from ordenadas o
  ),
  resueltas as (
    select
      c.*,
      c.mejor >= 4
        or (c.mejor = 3 and c.partidos <= 5 and c.ronda = 1) as decidida,
      case
        when c.wins_low > c.wins_high then c.team_low
        else c.team_high
      end as ganador
    from con_ronda c
  ),
  campeona as (
    select team_id
    from season_champions
    where season = target_season
      and competition = 'nba'
  )
  select
    r.ronda,
    case
      when r.ronda = 4 then 'Finales'
      else ta.conference
    end as conferencia,
    r.posicion::int as orden,
    ta.id,
    ta.name,
    ta.abbreviation,
    ta.logo_url,
    case when ta.id = r.team_low then r.wins_low else r.wins_high end as wins_a,
    tb.id,
    tb.name,
    tb.abbreviation,
    tb.logo_url,
    case when tb.id = r.team_low then r.wins_low else r.wins_high end as wins_b,
    r.decidida,
    coalesce(ta.id = (select c.team_id from campeona c), false) as campeon
  from resueltas r
  join teams ta
    on ta.id = case when r.decidida then r.ganador
                    when r.wins_low >= r.wins_high then r.team_low
                    else r.team_high end
  join teams tb
    on tb.id = case when ta.id = r.team_low then r.team_high else r.team_low end
  order by r.ronda desc, r.posicion;
$$;

grant execute on function playoff_bracket(text) to anon;
grant execute on function playoff_bracket(text) to authenticated;
