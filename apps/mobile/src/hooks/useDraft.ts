import { useQuery } from '@tanstack/react-query';
import { fetchDraftClass, fetchDraftYears, fetchPlayerDraft } from '@/lib/api/draft';

const UNA_HORA = 1000 * 60 * 60;

export function useDraftYears() {
  return useQuery({
    queryKey: ['draftYears'],
    queryFn: fetchDraftYears,
    staleTime: UNA_HORA,
  });
}

export function useDraftClass(year?: number) {
  return useQuery({
    queryKey: ['draftClass', year],
    queryFn: () => fetchDraftClass(year!),
    enabled: !!year,
    staleTime: UNA_HORA,
  });
}

export function usePlayerDraft(playerId: string) {
  return useQuery({
    queryKey: ['playerDraft', playerId],
    queryFn: () => fetchPlayerDraft(playerId),
    enabled: !!playerId,
    staleTime: UNA_HORA,
  });
}
