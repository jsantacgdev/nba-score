import type { LiveGame, LivePlayer, LiveScoreboardGame } from '@/types/domain';

const BASE = 'https://cdn.nba.com/static/json/liveData';

const CABECERAS = {
  Referer: 'https://www.nba.com/',
  Origin: 'https://www.nba.com',
};

async function pedirJson<T>(url: string): Promise<T> {
  const respuesta = await fetch(url, { headers: CABECERAS });
  if (!respuesta.ok) throw new Error(`La NBA respondio ${respuesta.status}`);
  return JSON.parse(await respuesta.text()) as T;
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

export async function fetchLiveScoreboard(): Promise<LiveScoreboardGame[]> {
  const datos = await pedirJson<any>(`${BASE}/scoreboard/todaysScoreboard_00.json`);
  const partidos = datos?.scoreboard?.games ?? [];

  return partidos.map((g: any) => ({
    gameId: String(g.gameId),
    status: g.gameStatus === 2 ? 'live' : g.gameStatus === 3 ? 'final' : 'scheduled',
    statusText: String(g.gameStatusText ?? '').trim(),
    period: g.period ?? 0,
    clock: relojLegible(g.gameClock),
    homeAbbr: String(g.homeTeam?.teamTricode ?? ''),
    awayAbbr: String(g.awayTeam?.teamTricode ?? ''),
    homeScore: g.homeTeam?.score ?? 0,
    awayScore: g.awayTeam?.score ?? 0,
  }));
}

function mapearJugadores(equipo: any): LivePlayer[] {
  return (equipo?.players ?? []).map((p: any) => ({
    playerId: String(p.personId),
    name: String(p.name ?? ''),
    jerseyNumber: p.jerseyNum ? String(p.jerseyNum) : undefined,
    starter: p.starter === '1',
    onCourt: p.oncourt === '1',
    played: p.played === '1',
    minutes: String(p.statistics?.minutes ?? ''),
    points: p.statistics?.points ?? 0,
    rebounds: p.statistics?.reboundsTotal ?? 0,
    assists: p.statistics?.assists ?? 0,
    steals: p.statistics?.steals ?? 0,
    blocks: p.statistics?.blocks ?? 0,
    plusMinus: p.statistics?.plusMinusPoints ?? 0,
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
