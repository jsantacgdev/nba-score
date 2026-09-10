import { useQuery } from '@tanstack/react-query';
import {
  fetchLiveGame,
  fetchLiveScoreboard,
  fetchPlayerPeriods,
} from '@/lib/api/live';
import { fetchStartingLineups } from '@/lib/api/starters';

const REFRESCO_MARCADOR = 15_000;
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
      return partidos.some((g) => g.status === 'live') ? REFRESCO_MARCADOR : false;
    },
    staleTime: 0,
  });
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
