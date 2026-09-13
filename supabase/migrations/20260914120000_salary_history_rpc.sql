-- ============================================
-- Historico de sueldos de un jugador
-- ============================================
-- Devuelve una fila por temporada y equipo, de la mas antigua a la mas
-- reciente. La agrupacion en "contratos" se hace en la app: juntar
-- temporadas consecutivas del mismo equipo es una decision de como se
-- presenta, no del dato.
--
-- Ojo con lo que significa ese agrupado: es una etapa en el equipo, no
-- necesariamente un unico contrato firmado. Si alguien renueva a mitad de
-- su estancia, las dos firmas se veran como un solo bloque.

create or replace function player_salary_history(target_player_id text)
returns table (
  season text,
  salary bigint,
  team_id text,
  team_name text,
  team_abbreviation text,
  team_logo_url text
)
language sql
stable
as $$
  select
    h.season,
    h.salary,
    h.team_id,
    h.team_name,
    t.abbreviation,
    t.logo_url
  from player_salary_history h
  left join teams t on t.id = h.team_id
  where h.player_id = target_player_id
  order by h.season, h.salary desc;
$$;

grant execute on function player_salary_history(text) to anon, authenticated;
