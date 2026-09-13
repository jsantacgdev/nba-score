import { useQuery } from '@tanstack/react-query';
import {
  fetchPlayerContract,
  fetchPlayerSalaryTimeline,
  fetchTeamSalary,
} from '@/lib/api/salary';

export function useTeamSalary(teamId?: string, season?: string) {
  return useQuery({
    queryKey: ['teamSalary', teamId, season],
    queryFn: () => fetchTeamSalary(teamId!, season!),
    enabled: !!teamId && !!season,
    staleTime: 1000 * 60 * 60,
  });
}

export function usePlayerContract(playerId?: string) {
  return useQuery({
    queryKey: ['playerContract', playerId],
    queryFn: () => fetchPlayerContract(playerId!),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 60,
  });
}

export function usePlayerSalaryTimeline(playerId?: string) {
  return useQuery({
    queryKey: ['playerSalaryTimeline', playerId],
    queryFn: () => fetchPlayerSalaryTimeline(playerId!),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 60,
  });
}
