import { useQuery } from '@tanstack/react-query';
import {
  fetchPlayerById,
  fetchPlayerCareer,
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

export function usePlayerGameLog(playerId: string) {
  return useQuery({
    queryKey: ['playerGameLog', playerId],
    queryFn: () => fetchPlayerGameLog(playerId),
    enabled: !!playerId,
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
