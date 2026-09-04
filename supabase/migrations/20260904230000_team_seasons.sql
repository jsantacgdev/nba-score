-- ============================================
-- Temporadas disponibles de un equipo
-- ============================================
-- Alimenta el selector de la pantalla de equipo. Marca las temporadas en
-- las que ESE equipo gano el anillo, para poder senalarlas en la lista.
--
-- Sale de player_season_teams, que es donde estan las plantillas: si un
-- equipo no existia todavia esa temporada, sencillamente no aparece.

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
  left join season_champions sc on sc.season = pst.season
  where pst.team_id = target_team_id
  group by pst.season
  order by pst.season desc;
$$;

grant execute on function team_seasons(text) to anon;
grant execute on function team_seasons(text) to authenticated;
