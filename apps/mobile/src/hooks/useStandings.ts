import { useQuery } from '@tanstack/react-query';
import { fetchStandings } from '@/lib/api/standings';

export function useStandings() {
  return useQuery({
    queryKey: ['standings'],
    queryFn: fetchStandings,
    staleTime: 1000 * 60 * 10,
  });
}
