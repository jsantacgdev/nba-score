import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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

export function useLiveScoreboard(activo = true) {
  return useQuery({
    queryKey: ['liveScoreboard'],
    queryFn: fetchLiveScoreboard,
    enabled: activo,
    refetchInterval: (query) => {
      const partidos = query.state.data ?? [];
      if (partidos.some((g) => g.status === 'live')) return REFRESCO_MARCADOR;
      if (partidos.some((g) => g.status === 'scheduled')) return REFRESCO_ESPERA;
      return false;
    },
    staleTime: 0,
  });
}

export function fusionarDirecto(game: Game, vivo?: LiveScoreboardGame): Game {
  if (!vivo) return game;

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
    const porId = new Map(data.map((g) => [g.gameId, g]));
    return games.map((g) => fusionarDirecto(g, porId.get(g.id)));
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
