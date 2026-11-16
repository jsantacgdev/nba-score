import { calculateGameScore } from '@/lib/gameScore';
import type {
  GameBoxScoreEntry,
  GameLineupPlayer,
  JugadorEnVivoEspn,
} from '@/types/domain';

/** Sin acentos ni puntuacion, para poder cruzar nombres entre fuentes. */
function normalizar(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Convierte el box score de ESPN al nuestro.
 *
 * ESPN identifica a los jugadores con sus propios numeros, asi que se
 * cruzan por nombre contra la plantilla que la pantalla ya tiene cargada.
 * El que no case se muestra igualmente con sus estadisticas, pero sin
 * enlace a su ficha: es preferible a esconderlo.
 */
export function boxScoreDesdeEspn(
  jugadores: JugadorEnVivoEspn[],
  plantilla: GameLineupPlayer[],
  teamAbbreviation: string,
  teamId: string,
): GameBoxScoreEntry[] {
  const porNombre = new Map(plantilla.map((p) => [normalizar(`${p.firstName} ${p.lastName}`), p]));

  return jugadores
    .filter((j) => j.teamAbbr === teamAbbreviation)
    .map((j) => {
      const nuestro = porNombre.get(normalizar(j.nombre));
      const partes = j.nombre.split(' ');

      const base = {
        // Sin ficha nuestra se usa el de ESPN con prefijo, para que la
        // lista tenga claves unicas y no se intente navegar a el
        playerId: nuestro?.playerId ?? `espn:${j.espnId}`,
        firstName: nuestro?.firstName ?? partes[0] ?? j.nombre,
        lastName: nuestro?.lastName ?? partes.slice(1).join(' '),
        photoUrl: nuestro?.photoUrl,
        teamId,
        minutes: j.minutes,
        points: j.points,
        rebounds: j.rebounds,
        assists: j.assists,
        steals: j.steals,
        blocks: j.blocks,
        turnovers: j.turnovers,
        fgMade: j.fgMade,
        fgAttempted: j.fgAttempted,
        fg3Made: j.fg3Made,
        fg3Attempted: j.fg3Attempted,
        ftMade: j.ftMade,
        ftAttempted: j.ftAttempted,
        plusMinus: j.plusMinus,
      };

      return { ...base, gameScore: calculateGameScore(base) };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

export type LineaCuarto = {
  periodo: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgMade: number;
  fgAttempted: number;
  fg3Made: number;
  fg3Attempted: number;
  ftMade: number;
  ftAttempted: number;
};

export function lineasPorCuarto(
  porCuarto: Record<number, JugadorEnVivoEspn[]> | undefined,
  nombre: string,
): LineaCuarto[] {
  if (!porCuarto) return [];
  const buscado = normalizar(nombre);

  return Object.entries(porCuarto)
    .map(([periodo, jugadores]) => {
      const suyo = jugadores.find((j) => normalizar(j.nombre) === buscado);
      return {
        periodo: Number(periodo),
        points: suyo?.points ?? 0,
        rebounds: suyo?.rebounds ?? 0,
        assists: suyo?.assists ?? 0,
        steals: suyo?.steals ?? 0,
        blocks: suyo?.blocks ?? 0,
        turnovers: suyo?.turnovers ?? 0,
        fgMade: suyo?.fgMade ?? 0,
        fgAttempted: suyo?.fgAttempted ?? 0,
        fg3Made: suyo?.fg3Made ?? 0,
        fg3Attempted: suyo?.fg3Attempted ?? 0,
        ftMade: suyo?.ftMade ?? 0,
        ftAttempted: suyo?.ftAttempted ?? 0,
      };
    })
    .sort((a, b) => a.periodo - b.periodo);
}
