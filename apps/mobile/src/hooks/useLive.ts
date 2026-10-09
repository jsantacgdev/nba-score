import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  claveEnfrentamiento,
  fetchLiveGame,
  fetchLiveScoreboard,
  fetchPlayerPeriods,
} from '@/lib/api/live';
import { fetchStartingLineups } from '@/lib/api/starters';
import type { Game, LiveScoreboardGame } from '@/types/domain';

const REFRESCO_MARCADOR = 15_000;
const REFRESCO_ESPERA = 60_000;
const REFRESCO_PARTIDO = 15_000;
const REFRESCO_ALINEACION = 60_000;
const REFRESCO_CUARTOS = 90_000;

/** Si la consulta falla se reintenta a este ritmo en vez de rendirse. */
const REFRESCO_TRAS_FALLO = 30_000;

/**
 * Margen para dar por bueno el cruce entre un partido en directo y el
 * nuestro. ESPN usa sus propios identificadores, asi que se cruzan por
 * equipos; la hora evita confundir dos enfrentamientos iguales de dias
 * distintos.
 */
const MARGEN_CRUCE_MS = 12 * 60 * 60 * 1000;

export function useLiveScoreboard(activo = true) {
  return useQuery({
    queryKey: ['liveScoreboard'],
    queryFn: fetchLiveScoreboard,
    enabled: activo,
    refetchInterval: (query) => {
      // Sin datos por un error: hay que seguir intentandolo. Antes esta
      // rama devolvia false y el directo se apagaba para siempre tras el
      // primer fallo de red.
      if (query.state.status === 'error' || !query.state.data) {
        return REFRESCO_TRAS_FALLO;
      }
      const partidos = query.state.data;
      if (partidos.some((g) => g.status === 'live')) return REFRESCO_MARCADOR;
      if (partidos.some((g) => g.status === 'scheduled')) return REFRESCO_ESPERA;
      return REFRESCO_ESPERA;
    },
    refetchIntervalInBackground: false,
    retry: 3,
    retryDelay: (intento) => Math.min(1000 * 2 ** intento, 15_000),
    staleTime: 0,
  });
}

export function fusionarDirecto(game: Game, vivo?: LiveScoreboardGame): Game {
  if (!vivo) return game;

  // Si el cruce fuera al reves, local y visitante irian cambiados
  const invertido =
    vivo.homeAbbr !== game.homeTeam.abbreviation &&
    vivo.awayAbbr === game.homeTeam.abbreviation;

  return {
    ...game,
    status: vivo.status,
    scoreHome: invertido ? vivo.awayScore : vivo.homeScore,
    scoreAway: invertido ? vivo.homeScore : vivo.awayScore,
    period: vivo.period || game.period,
    timeRemaining: vivo.clock ?? game.timeRemaining,
  };
}

export function useGamesConDirecto(games: Game[] | undefined, activo = true) {
  const { data } = useLiveScoreboard(activo);

  return useMemo(() => {
    if (!games?.length) return games ?? [];
    if (!data?.length) return games;

    // El cruce va por enfrentamiento y no por identificador: los de ESPN
    // son suyos y no coinciden con los de la NBA.
    const porEnfrentamiento = new Map<string, LiveScoreboardGame[]>();
    for (const vivo of data) {
      const clave = claveEnfrentamiento(vivo.awayAbbr, vivo.homeAbbr);
      const lista = porEnfrentamiento.get(clave);
      if (lista) lista.push(vivo);
      else porEnfrentamiento.set(clave, [vivo]);
    }

    return games.map((g) => {
      const candidatos = porEnfrentamiento.get(
        claveEnfrentamiento(g.awayTeam.abbreviation, g.homeTeam.abbreviation),
      );
      if (!candidatos?.length) return g;

      const vivo = candidatos.find(
        (v) => Math.abs(v.startsAt.getTime() - g.startsAt.getTime()) < MARGEN_CRUCE_MS,
      );
      return fusionarDirecto(g, vivo);
    });
  }, [games, data]);
}

export function useLiveGame(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['liveGame', gameId],
    queryFn: () => fetchLiveGame(gameId!),
    enabled: !!gameId && activo,
    refetchInterval: (query) =>
      query.state.data?.status === 'live' ? REFRESCO_PARTIDO : false,
    staleTime: 0,
  });
}

export function useLiveLineup(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['liveLineup', gameId],
    queryFn: () => fetchLiveGame(gameId!),
    enabled: !!gameId && activo,
    refetchInterval: (query) =>
      query.state.data?.status === 'live' ? REFRESCO_ALINEACION : false,
    staleTime: REFRESCO_ALINEACION,
  });
}

export function usePlayerPeriods(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['playerPeriods', gameId],
    queryFn: () => fetchPlayerPeriods(gameId!),
    enabled: !!gameId && activo,
    refetchInterval: REFRESCO_CUARTOS,
    staleTime: REFRESCO_CUARTOS,
  });
}

export function useStartingLineups(gameId?: string) {
  return useQuery({
    queryKey: ['startingLineups', gameId],
    queryFn: () => fetchStartingLineups(gameId!),
    enabled: !!gameId,
    staleTime: Infinity,
  });
}
