-- ============================================
-- Contrato de un jugador, temporada a temporada
-- ============================================
-- Las mismas filas que alimentan el estado salarial del equipo, vistas
-- desde el jugador. Se incluye el equipo porque un cortado sigue cobrando
-- del anterior mientras firma con otro, y ahi conviene ver de quien viene
-- cada cantidad.

create or replace function player_contract(target_player_id text)
returns table (
  season text,
  salary bigint,
  team_id text,
  team_abbreviation text,
  team_name text,
  team_logo_url text
)
language sql
stable
as $$
  select
    c.season,
    c.salary,
    c.team_id,
    t.abbreviation,
    t.name,
    t.logo_url
  from player_contracts c
  left join teams t on t.id = c.team_id
  where c.player_id = target_player_id
  order by c.season, c.salary desc;
$$;

grant execute on function player_contract(text) to anon, authenticated;
