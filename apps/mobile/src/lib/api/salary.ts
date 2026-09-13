import { supabase } from '@/lib/supabase';
import type {
  PlayerContractYear,
  PlayerSalarySeason,
  SalaryStint,
  TeamSalary,
} from '@/types/domain';

/**
 * Estado salarial de un equipo en una temporada.
 *
 * La funcion devuelve una fila por jugador y repite en todas la nomina y
 * los umbrales, porque es una sola consulta y evita un segundo viaje.
 */
export async function fetchTeamSalary(
  teamId: string,
  season: string,
): Promise<TeamSalary | null> {
  const { data, error } = await supabase.rpc('team_salary', {
    target_team_id: teamId,
    target_season: season,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const primera = data[0]!;
  return {
    season,
    payroll: Number(primera.payroll ?? 0),
    salaryCap: Number(primera.salary_cap ?? 0),
    salaryFloor: Number(primera.salary_floor ?? 0),
    luxuryTax: Number(primera.luxury_tax ?? 0),
    firstApron: Number(primera.first_apron ?? 0),
    secondApron: Number(primera.second_apron ?? 0),
    players: data.map((row) => ({
      playerId: row.player_id,
      playerName: row.player_name,
      photoUrl: row.photo_url ?? undefined,
      jerseyNumber: row.jersey_number ?? undefined,
      position: row.player_position ?? undefined,
      salary: Number(row.salary ?? 0),
    })),
  };
}

/** Contrato de un jugador, una fila por temporada. */
export async function fetchPlayerContract(playerId: string): Promise<PlayerContractYear[]> {
  const { data, error } = await supabase.rpc('player_contract', {
    target_player_id: playerId,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    season: row.season,
    salary: Number(row.salary ?? 0),
    teamId: row.team_id ?? undefined,
    teamAbbreviation: row.team_abbreviation ?? undefined,
    teamName: row.team_name ?? undefined,
    teamLogoUrl: row.team_logo_url ?? undefined,
  }));
}

/**
 * Todas las temporadas de sueldo de un jugador, pasadas y futuras.
 *
 * Son dos fuentes distintas: player_salary_history guarda lo ya cobrado y
 * player_contracts lo que queda por cobrar. Se juntan aqui porque para
 * quien mira la ficha es lo mismo, y se marca cuales aun no se han jugado.
 */
export async function fetchPlayerSalaryTimeline(
  playerId: string,
): Promise<PlayerSalarySeason[]> {
  const [historico, contrato] = await Promise.all([
    supabase.rpc('player_salary_history', { target_player_id: playerId }),
    supabase.rpc('player_contract', { target_player_id: playerId }),
  ]);
  if (historico.error) throw historico.error;
  if (contrato.error) throw contrato.error;

  const temporadas = new Map<string, PlayerSalarySeason>();

  for (const row of historico.data ?? []) {
    temporadas.set(`${row.season}|${row.team_name}`, {
      season: row.season,
      salary: Number(row.salary ?? 0),
      teamId: row.team_id ?? undefined,
      teamName: row.team_name,
      teamAbbreviation: row.team_abbreviation ?? undefined,
      teamLogoUrl: row.team_logo_url ?? undefined,
      future: false,
    });
  }

  for (const row of contrato.data ?? []) {
    const nombre = row.team_name ?? row.team_abbreviation ?? '';
    const clave = `${row.season}|${nombre}`;
    // Lo ya cobrado manda: si la temporada esta en las dos, no es futura
    if (temporadas.has(clave)) continue;
    temporadas.set(clave, {
      season: row.season,
      salary: Number(row.salary ?? 0),
      teamId: row.team_id ?? undefined,
      teamName: nombre,
      teamAbbreviation: row.team_abbreviation ?? undefined,
      teamLogoUrl: row.team_logo_url ?? undefined,
      future: true,
    });
  }

  return Array.from(temporadas.values()).sort((a, b) => a.season.localeCompare(b.season));
}

/**
 * Agrupa las temporadas en etapas: tramos seguidos en el mismo equipo.
 *
 * No equivale exactamente a "un contrato": si alguien renueva sin cambiar
 * de equipo, las dos firmas caen en la misma etapa. Es la lectura que
 * tiene sentido con lo que publica la fuente, que da sueldos por
 * temporada y no contratos.
 */
export function agruparEtapas(temporadas: PlayerSalarySeason[]): SalaryStint[] {
  const etapas: SalaryStint[] = [];

  for (const t of temporadas) {
    const ultima = etapas[etapas.length - 1];
    const mismaEtapa =
      ultima &&
      ultima.teamName === t.teamName &&
      // Consecutiva: 2019-20 sigue a 2018-19
      Number(ultima.endSeason.slice(0, 4)) + 1 === Number(t.season.slice(0, 4));

    if (mismaEtapa) {
      ultima.endSeason = t.season;
      ultima.total += t.salary;
      ultima.seasons.push(t);
    } else {
      etapas.push({
        teamName: t.teamName,
        teamId: t.teamId,
        teamAbbreviation: t.teamAbbreviation,
        teamLogoUrl: t.teamLogoUrl,
        startSeason: t.season,
        endSeason: t.season,
        total: t.salary,
        seasons: [t],
      });
    }
  }

  return etapas.reverse();
}
