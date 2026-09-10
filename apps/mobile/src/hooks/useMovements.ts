import { useQuery } from '@tanstack/react-query';
import {
  fetchDealDetail,
  fetchPlayerInjuries,
  fetchPlayerMovements,
  fetchTeamMovements,
} from '@/lib/api/movements';

export function usePlayerMovements(playerId?: string) {
  return useQuery({
    queryKey: ['playerMovements', playerId],
    queryFn: () => fetchPlayerMovements(playerId!),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 60,
  });
}

export function useTeamMovements(teamId?: string) {
  return useQuery({
    queryKey: ['teamMovements', teamId],
    queryFn: () => fetchTeamMovements(teamId!),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 60,
  });
}

export function useDealDetail(dealId?: string) {
  return useQuery({
    queryKey: ['dealDetail', dealId],
    queryFn: () => fetchDealDetail(dealId!),
    enabled: !!dealId,
    staleTime: 1000 * 60 * 60,
  });
}

export function usePlayerInjuries(playerId?: string) {
  return useQuery({
    queryKey: ['playerInjuries', playerId],
    queryFn: () => fetchPlayerInjuries(playerId!),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 15,
  });
}
