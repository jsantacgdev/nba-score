import { useQuery } from '@tanstack/react-query';
import {
  fetchPlayerById,
  fetchPlayerCareer,
  fetchPlayerAwards,
  fetchPlayerCareerTotals,
  fetchPlayerGameLog,
  fetchPlayerSeasonStats,
} from '@/lib/api/players';

export function usePlayer(playerId: string) {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => fetchPlayerById(playerId),
    enabled: !!playerId,
  });
}

export function usePlayerSeasonStats(playerId: string) {
  return useQuery({
    queryKey: ['playerSeasonStats', playerId],
    queryFn: () => fetchPlayerSeasonStats(playerId),
    enabled: !!playerId,
  });
}

/**
 * @param enabled Los jugadores históricos no tienen box scores cargados,
 *                así que ni se pide.
 */
export function usePlayerGameLog(playerId: string, enabled = true, season?: string) {
  return useQuery({
    queryKey: ['playerGameLog', playerId, season],
    queryFn: () => fetchPlayerGameLog(playerId, season),
    enabled: !!playerId && enabled,
  });
}

export function usePlayerCareer(playerId: string) {
  return useQuery({
    queryKey: ['playerCareer', playerId],
    queryFn: () => fetchPlayerCareer(playerId),
    enabled: !!playerId,
    // El historico no cambia salvo backfill, aguanta de sobra una hora
    staleTime: 1000 * 60 * 60,
  });
}

export function usePlayerCareerTotals(playerId: string) {
  return useQuery({
    queryKey: ['playerCareerTotals', playerId],
    queryFn: () => fetchPlayerCareerTotals(playerId),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 60,
  });
}

export function usePlayerAwards(playerId: string) {
  return useQuery({
    queryKey: ['playerAwards', playerId],
    queryFn: () => fetchPlayerAwards(playerId),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 60,
  });
}
