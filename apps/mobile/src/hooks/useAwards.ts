import { useQuery } from '@tanstack/react-query';
import { fetchAwardHistory } from '@/lib/api/awards';

export function useAwardHistory(award?: string, activo = true) {
  return useQuery({
    queryKey: ['awardHistory', award],
    queryFn: () => fetchAwardHistory(award!),
    enabled: !!award && activo,
    staleTime: Infinity,
  });
}
