import type {
  GameBoxScoreEntry,
  LiveGame,
  LivePlayer,
  LiveScoreboardGame,
  LiveTeam,
} from '@/types/domain';

const BASE = 'https://cdn.nba.com/static/json/liveData';

// El CDN de la NBA solo acepta peticiones con pinta de navegador. Sigue
// usandose para el box score en vivo, que ESPN no da en este formato.
const CABECERAS = {
  Referer: 'https://www.nba.com/',
  Origin: 'https://www.nba.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
};

/**
 * El marcador en directo viene de ESPN, no del CDN de la NBA.
 *
 * El CDN de la NBA responde 403 a la app pase lo que pase: se probaron seis
 * juegos de cabeceras distintos desde el movil, incluido el que funciona
 * desde un PC, y los seis fueron rechazados. El bloqueo no mira las
 * cabeceras sino la pila HTTP de Android. ESPN responde sin pedir nada.
 */
const BASE_ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

/**
 * ESPN abrevia seis equipos de otra forma que la NBA.
 *
 * Importa porque sus identificadores de partido son suyos y no se parecen
 * a los de la NBA, asi que los partidos se cruzan por equipos y fecha.
 */
const ABREVIATURAS_ESPN: Record<string, string> = {
  GS: 'GSW',
  NO: 'NOP',
  NY: 'NYK',
  SA: 'SAS',
  UTAH: 'UTA',
  WSH: 'WAS',
};

function abreviatura(valor?: string): string {
  const limpia = String(valor ?? '').toUpperCase();
  return ABREVIATURAS_ESPN[limpia] ?? limpia;
}

/** Clave para cruzar un partido en directo con el de nuestra base. */
export function claveEnfrentamiento(awayAbbr: string, homeAbbr: string): string {
  return `${awayAbbr}@${homeAbbr}`;
}

async function pedirJson<T>(url: string): Promise<T> {
  const respuesta = await fetch(url, { headers: CABECERAS });
  if (!respuesta.ok) throw new Error(`La NBA respondio ${respuesta.status}`);
  return JSON.parse(await respuesta.text()) as T;
}

async function pedirEspn<T>(url: string): Promise<T> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`ESPN respondio ${respuesta.status}`);
  return (await respuesta.json()) as T;
}

export function relojLegible(iso?: string): string | undefined {
  if (!iso) return undefined;
  const encontrado = /PT(\d+)M([\d.]+)S/.exec(iso);
  if (!encontrado) return undefined;
  const minutos = Number(encontrado[1]);
  const segundos = Math.floor(Number(encontrado[2]));
  if (minutos === 0 && segundos === 0) return undefined;
  return `${minutos}:${String(segundos).padStart(2, '0')}`;
}

/**
 * Estado de ESPN al nuestro.
 *
 * Solo 'STATUS_SCHEDULED' y 'STATUS_FINAL' son definitivos; el descanso y
 * el fin de cuarto son nombres propios que siguen siendo partido en juego,
 * asi que cualquier otro estado cuenta como en vivo.
 */
function estadoEspn(nombre: string): 'scheduled' | 'live' | 'final' {
  if (nombre === 'STATUS_SCHEDULED') return 'scheduled';
  if (nombre === 'STATUS_FINAL') return 'final';
  if (nombre === 'STATUS_POSTPONED' || nombre === 'STATUS_CANCELED') return 'scheduled';
  return 'live';
}

export async function fetchLiveScoreboard(): Promise<LiveScoreboardGame[]> {
  const datos = await pedirEspn<any>(`${BASE_ESPN}/scoreboard`);

  return (datos?.events ?? []).map((evento: any) => {
    const competicion = evento?.competitions?.[0] ?? {};
    const estado = competicion?.status ?? {};
    const tipo = estado?.type ?? {};

    const equipos: Record<string, any> = {};
    for (const competidor of competicion?.competitors ?? []) {
      equipos[competidor.homeAway] = competidor;
    }
    const local = equipos.home ?? {};
    const visitante = equipos.away ?? {};

    const estadoPartido = estadoEspn(String(tipo.name ?? ''));
    // En un partido terminado ESPN sigue mandando "12:00": solo vale el
    // reloj mientras se juega
    const reloj =
      estadoPartido === 'live' ? String(estado.displayClock ?? '').trim() : '';

    return {
      gameId: String(evento.id),
      startsAt: new Date(evento.date ?? competicion.date ?? Date.now()),
      status: estadoPartido,
      statusText: String(tipo.shortDetail ?? tipo.description ?? '').trim(),
      period: Number(estado.period ?? 0),
      // ESPN manda "0.0" cuando no hay reloj que enseñar
      clock: reloj && reloj !== '0.0' ? reloj : undefined,
      homeAbbr: abreviatura(local?.team?.abbreviation),
      awayAbbr: abreviatura(visitante?.team?.abbreviation),
      homeScore: Number(local?.score ?? 0),
      awayScore: Number(visitante?.score ?? 0),
    } satisfies LiveScoreboardGame;
  });
}

export function minutosJugados(iso?: string): number {
  if (!iso) return 0;
  const encontrado = /PT(\d+)M([\d.]+)S/.exec(iso);
  if (!encontrado) return 0;
  return Number(encontrado[1]) + Number(encontrado[2]) / 60;
}

function mapearJugadores(equipo: any): LivePlayer[] {
  return (equipo?.players ?? []).map((p: any) => {
    const s = p.statistics ?? {};
    return {
      playerId: String(p.personId),
      name: String(p.name ?? ''),
      firstName: String(p.firstName ?? ''),
      lastName: String(p.familyName ?? ''),
      jerseyNumber: p.jerseyNum ? String(p.jerseyNum) : undefined,
      starter: p.starter === '1',
      onCourt: p.oncourt === '1',
      played: p.played === '1',
      minutes: String(s.minutes ?? ''),
      minutosJugados: minutosJugados(s.minutes),
      points: s.points ?? 0,
      rebounds: s.reboundsTotal ?? 0,
      reboundsOffensive: s.reboundsOffensive ?? 0,
      reboundsDefensive: s.reboundsDefensive ?? 0,
      assists: s.assists ?? 0,
      steals: s.steals ?? 0,
      blocks: s.blocks ?? 0,
      turnovers: s.turnovers ?? 0,
      fouls: s.foulsPersonal ?? 0,
      fgMade: s.fieldGoalsMade ?? 0,
      fgAttempted: s.fieldGoalsAttempted ?? 0,
      fg3Made: s.threePointersMade ?? 0,
      fg3Attempted: s.threePointersAttempted ?? 0,
      ftMade: s.freeThrowsMade ?? 0,
      ftAttempted: s.freeThrowsAttempted ?? 0,
      plusMinus: s.plusMinusPoints ?? 0,
    };
  });
}

function gameScore(p: LivePlayer): number {
  return (
    p.points +
    0.4 * p.fgMade -
    0.7 * p.fgAttempted -
    0.4 * (p.ftAttempted - p.ftMade) +
    0.7 * p.reboundsOffensive +
    0.3 * p.reboundsDefensive +
    p.steals +
    0.7 * p.assists +
    0.7 * p.blocks -
    0.4 * p.fouls -
    p.turnovers
  );
}

export function boxScoreDesdeDirecto(equipo: LiveTeam, teamId: string): GameBoxScoreEntry[] {
  return equipo.players.map((p) => ({
    playerId: p.playerId,
    firstName: p.firstName || p.name.split(' ')[0] || '',
    lastName: p.lastName || p.name.split(' ').slice(1).join(' ') || p.name,
    teamId,
    minutes: p.minutosJugados,
    points: p.points,
    rebounds: p.rebounds,
    assists: p.assists,
    steals: p.steals,
    blocks: p.blocks,
    turnovers: p.turnovers,
    fgMade: p.fgMade,
    fgAttempted: p.fgAttempted,
    fg3Made: p.fg3Made,
    fg3Attempted: p.fg3Attempted,
    ftMade: p.ftMade,
    ftAttempted: p.ftAttempted,
    plusMinus: p.plusMinus,
    gameScore: gameScore(p),
  }));
}

export async function fetchLiveGame(gameId: string): Promise<LiveGame | null> {
  const datos = await pedirJson<any>(`${BASE}/boxscore/boxscore_${gameId}.json`);
  const g = datos?.game;
  if (!g) return null;

  return {
    gameId: String(g.gameId),
    status: g.gameStatus === 2 ? 'live' : g.gameStatus === 3 ? 'final' : 'scheduled',
    statusText: String(g.gameStatusText ?? '').trim(),
    period: g.period ?? 0,
    clock: relojLegible(g.gameClock),
    arena: g.arena?.arenaName ? String(g.arena.arenaName) : undefined,
    attendance: g.attendance ?? undefined,
    home: {
      abbreviation: String(g.homeTeam?.teamTricode ?? ''),
      score: g.homeTeam?.score ?? 0,
      periods: (g.homeTeam?.periods ?? []).map((p: any) => p.score ?? 0),
      players: mapearJugadores(g.homeTeam),
    },
    away: {
      abbreviation: String(g.awayTeam?.teamTricode ?? ''),
      score: g.awayTeam?.score ?? 0,
      periods: (g.awayTeam?.periods ?? []).map((p: any) => p.score ?? 0),
      players: mapearJugadores(g.awayTeam),
    },
  };
}

export async function fetchPlayerPeriods(
  gameId: string,
): Promise<Record<string, Record<number, number>>> {
  const datos = await pedirJson<any>(`${BASE}/playbyplay/playbyplay_${gameId}.json`);
  const acciones = datos?.game?.actions ?? [];

  const porJugador: Record<string, Record<number, number>> = {};

  for (const a of acciones) {
    if (a?.shotResult !== 'Made') continue;
    const personId = a?.personId ? String(a.personId) : null;
    if (!personId) continue;

    const valor = a.actionType === '3pt' ? 3 : a.actionType === 'freethrow' ? 1 : 2;
    const periodo = Number(a.period ?? 0);
    if (!periodo) continue;

    porJugador[personId] ??= {};
    porJugador[personId][periodo] = (porJugador[personId][periodo] ?? 0) + valor;
  }

  return porJugador;
}
