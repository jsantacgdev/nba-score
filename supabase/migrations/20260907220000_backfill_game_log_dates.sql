-- ============================================
-- Relleno reutilizable de fecha y temporada en player_game_log
-- ============================================
-- El endpoint de box score de la NBA no devuelve ni la fecha ni la
-- temporada del partido. sync_box_scores ya las sella al insertar, pero
-- las cargas lanzadas antes de ese arreglo dejaron filas incompletas.
--
-- Como funcion en vez de como UPDATE suelto para poder relanzarla sin
-- crear una migracion nueva cada vez. Es idempotente: solo toca lo que
-- esta a null.
--
-- No se concede a anon: escribe.

create or replace function backfill_game_log_dates()
returns table (
  fechas_rellenadas int,
  temporadas_rellenadas int
)
language plpgsql
as $$
declare
  n_fechas int;
  n_temporadas int;
begin
  update player_game_log l
  set game_date = g.starts_at
  from games g
  where g.id = l.game_id
    and l.game_date is null;
  get diagnostics n_fechas = row_count;

  update player_game_log l
  set season = g.season
  from games g
  where g.id = l.game_id
    and l.season is null;
  get diagnostics n_temporadas = row_count;

  return query select n_fechas, n_temporadas;
end;
$$;
