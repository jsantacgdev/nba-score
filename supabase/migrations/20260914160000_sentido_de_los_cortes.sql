-- ============================================
-- Un corte saca al jugador, no lo trae
-- ============================================
-- El feed anota un solo equipo por movimiento y siempre en la misma
-- columna, pero no significa lo mismo en los tres casos: en un fichaje es
-- el destino y en un corte es el equipo que lo deja libre.
--
-- team_movements no lo distinguia, asi que en la ficha de equipo un corte
-- salia con la flecha verde de llegada, como si el equipo acabara de
-- ficharlo cuando en realidad acababa de soltarlo. El resto de la funcion
-- ya estaba bien: para un corte from_team_id es nulo, asi que la fila solo
-- aparece en el equipo que corta y basta con darle el sentido correcto.
--
-- Las otras dos vistas del mismo dato, la ficha de jugador y el hilo de
-- novedades, se corrigen en la aplicacion, que es donde deciden de que
-- lado pintar cada logo.

create or replace function team_movements(target_team_id text)
returns table (
  id text,
  deal_id text,
  transaction_type text,
  transaction_date date,
  description text,
  direction text,
  player_id text,
  player_name text,
  photo_url text,
  other_team_id text,
  other_abbreviation text,
  other_logo_url text
)
language sql
stable
as $$
  select
    t.id,
    t.deal_id,
    t.transaction_type,
    t.transaction_date,
    t.description,
    case
      when t.transaction_type = 'Waive' then 'out'
      when t.team_id = target_team_id then 'in'
      else 'out'
    end as direction,
    t.player_id,
    trim(coalesce(p.first_name || ' ' || p.last_name, '')) as player_name,
    p.photo_url,
    case when t.team_id = target_team_id then t.from_team_id else t.team_id end,
    other.abbreviation,
    other.logo_url
  from player_transactions t
  left join players p on p.id = t.player_id
  left join teams other
    on other.id = case when t.team_id = target_team_id then t.from_team_id else t.team_id end
  where t.team_id = target_team_id or t.from_team_id = target_team_id
  order by t.transaction_date desc, t.id;
$$;

grant execute on function team_movements(text) to anon, authenticated;
