-- ============================================
-- Los dos ganadores del Rookie del Año por clase
-- ============================================
-- Seis clases de draft tienen dos ganadores y ninguna tiene tres, asi
-- que se devuelven ambos en lugar de quedarse con uno.
--
-- Los dos motivos por los que ocurre son distintos y los dos son reales:
--
--   * Premio compartido: Grant Hill y Jason Kidd lo ganaron a medias en
--     1994-95, igual que Brand y Francis en 1999-00.
--   * Novato con retraso: Ben Simmons y Blake Griffin se perdieron su
--     primer año lesionados y lo ganaron al siguiente, coincidiendo con
--     otro companero de su misma clase.
--
-- Que un año no tenga ganador tampoco es un fallo: el ROY de esa
-- temporada puede venir de una clase anterior. Paso en 2017, 2010, 1989
-- y 1979.

drop function if exists draft_years();

create or replace function draft_years()
returns table (
  draft_year int,
  picks int,
  rounds int,
  roy_player_id text,
  roy_player_name text,
  roy_photo_url text,
  roy_season text,
  roy2_player_id text,
  roy2_player_name text,
  roy2_photo_url text,
  roy2_season text
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
      pl.photo_url,
      a.season,
      row_number() over (
        partition by d.draft_year
        order by a.season, coalesce(d.overall_pick, 999)
      ) as orden
    from draft_picks d
    join player_awards a
      on a.player_id = d.player_id
     and a.award = 'roy'
    left join players pl on pl.id = d.player_id
  )
  select
    r.draft_year,
    r.picks,
    r.rounds,
    p1.player_id,
    p1.player_name,
    p1.photo_url,
    p1.season,
    p2.player_id,
    p2.player_name,
    p2.photo_url,
    p2.season
  from resumen r
  left join premiados p1 on p1.draft_year = r.draft_year and p1.orden = 1
  left join premiados p2 on p2.draft_year = r.draft_year and p2.orden = 2
  order by r.draft_year desc;
$$;

grant execute on function draft_years() to anon;
grant execute on function draft_years() to authenticated;
