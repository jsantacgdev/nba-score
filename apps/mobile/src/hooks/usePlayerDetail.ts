import { useQuery } from '@tanstack/react-query';
import { fetchPlayerById, fetchPlayerGameLog, fetchPlayerSeasonStats } from '@/lib/api/players';

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
