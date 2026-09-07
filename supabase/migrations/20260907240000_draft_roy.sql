-- ============================================
-- Rookie del Año y foto en las pantallas del draft
-- ============================================
-- El premio se cruza por jugador, no por año, porque no hay una relacion
-- limpia entre una clase de draft y un Rookie del Año:
--
--   * Se ha compartido: Grant Hill y Jason Kidd lo ganaron los dos en
--     1994-95, igual que Brand y Francis en 1999-00.
--   * No siempre es el año siguiente al draft: Larry Bird fue elegido en
--     1978 y lo gano en 1979-80 tras un año mas en la universidad, y
--     Blake Griffin en 2010-11 porque se perdio su año de novato.
--
-- Por eso draft_class marca el trofeo en cada jugador que lo gano, y
-- draft_years devuelve uno solo para la etiqueta del selector: el de
-- temporada mas temprana, desempatando por numero de eleccion.

drop function if exists draft_years();
drop function if exists draft_class(int);

create or replace function draft_years()
returns table (
  draft_year int,
  picks int,
  rounds int,
  roy_player_id text,
  roy_player_name text,
  roy_photo_url text,
  roy_season text
)
language sql
stable
as $$
  with resumen as (
    select
      d.draft_year,
      count(*)::int as picks,
      count(distinct d.round)::int as rounds
    from draft_picks d
    group by d.draft_year
  ),
  premiados as (
    select
      d.draft_year,
      d.player_id,
      d.player_name,
      a.season,
      row_number() over (
        partition by d.draft_year
        order by a.season, coalesce(d.overall_pick, 999)
      ) as orden
    from draft_picks d
    join player_awards a
      on a.player_id = d.player_id
     and a.award = 'roy'
  )
  select
    r.draft_year,
    r.picks,
    r.rounds,
    p.player_id as roy_player_id,
    p.player_name as roy_player_name,
    pl.photo_url as roy_photo_url,
    p.season as roy_season
  from resumen r
  left join premiados p
    on p.draft_year = r.draft_year
   and p.orden = 1
  left join players pl on pl.id = p.player_id
  order by r.draft_year desc;
$$;

create or replace function draft_class(target_year int)
returns table (
  player_id text,
  player_name text,
  photo_url text,
  round int,
  round_pick int,
  overall_pick int,
  team_id text,
  team_abbreviation text,
  team_logo_url text,
  organization text,
  has_profile boolean,
  roy_season text
)
language sql
stable
as $$
  select
    d.player_id,
    d.player_name,
    p.photo_url,
    d.round,
    d.round_pick,
    d.overall_pick,
    d.team_id,
    coalesce(t.abbreviation, d.team_abbreviation) as team_abbreviation,
    t.logo_url as team_logo_url,
    d.organization,
    (p.id is not null) as has_profile,
    -- La temporada en que gano el Rookie del Año, si lo gano
    (
      select a.season
      from player_awards a
      where a.player_id = d.player_id
        and a.award = 'roy'
      order by a.season
      limit 1
    ) as roy_season
  from draft_picks d
  left join teams t on t.id = d.team_id
  left join players p on p.id = d.player_id
  where d.draft_year = target_year
  order by d.round, d.round_pick, d.overall_pick;
$$;

grant execute on function draft_years() to anon;
grant execute on function draft_years() to authenticated;
grant execute on function draft_class(int) to anon;
grant execute on function draft_class(int) to authenticated;
