-- ============================================
-- Contratos y estado salarial
-- ============================================
-- Los salarios no estan en nba_api ni en el plan gratuito de balldontlie.
-- Se cargan de las paginas de contratos de Basketball-Reference, que dan
-- el salario de cada temporada futura hasta seis años vista.
--
-- Ojo con el alcance: son contratos VIGENTES, no historico. Lo que un
-- jugador cobro en 2010 esta en su ficha personal y es otra descarga.

create table player_contracts (
  player_id text not null references players(id) on delete cascade,
  team_id text not null references teams(id),
  season text not null,
  salary bigint not null,
  updated_at timestamptz default now(),
  primary key (player_id, season)
);

create index idx_contracts_team on player_contracts(team_id, season);
create index idx_contracts_season on player_contracts(season, salary desc);

alter table player_contracts enable row level security;
create policy "Public read contracts" on player_contracts for select using (true);

-- ============================================
-- Umbrales de cada temporada
-- ============================================
-- Los fija la NBA cada verano y no los publica ninguna API. El tope de
-- 2026-27 se ha contrastado con Basketball-Reference, que da la misma
-- cifra exacta.
--
-- Los aprons solo existen desde el convenio de 2023, asi que en
-- temporadas anteriores van a nulo.

create table salary_cap_rules (
  season text primary key,
  salary_cap bigint not null,
  salary_floor bigint,
  luxury_tax bigint,
  first_apron bigint,
  second_apron bigint
);

alter table salary_cap_rules enable row level security;
create policy "Public read cap rules" on salary_cap_rules for select using (true);

insert into salary_cap_rules (season, salary_cap, salary_floor, luxury_tax, first_apron, second_apron)
values ('2026-27', 164961000, 148465000, 200428000, 209015000, 221686000);

-- ============================================
-- Estado salarial de un equipo
-- ============================================
-- Devuelve la nomina y cada umbral, para que la app pueda decir en que
-- tramo esta el equipo sin recalcular nada.
create or replace function team_salary(target_team_id text, target_season text)
returns table (
  player_id text,
  player_name text,
  photo_url text,
  jersey_number text,
  -- 'position' es palabra reservada dentro de un returns table
  player_position text,
  salary bigint,
  payroll bigint,
  salary_cap bigint,
  salary_floor bigint,
  luxury_tax bigint,
  first_apron bigint,
  second_apron bigint
)
language sql
stable
as $$
  with nomina as (
    select coalesce(sum(c.salary), 0) as total
    from player_contracts c
    where c.team_id = target_team_id and c.season = target_season
  ),
  reglas as (
    select * from salary_cap_rules where season = target_season
  )
  select
    c.player_id,
    trim(p.first_name || ' ' || p.last_name) as player_name,
    p.photo_url,
    p.jersey_number,
    p.position,
    c.salary,
    (select total from nomina),
    r.salary_cap,
    r.salary_floor,
    r.luxury_tax,
    r.first_apron,
    r.second_apron
  from player_contracts c
  join players p on p.id = c.player_id
  left join reglas r on true
  where c.team_id = target_team_id and c.season = target_season
  order by c.salary desc;
$$;

grant execute on function team_salary(text, text) to anon, authenticated;
