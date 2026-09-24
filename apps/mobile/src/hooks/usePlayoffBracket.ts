import { useQuery } from '@tanstack/react-query';
import { fetchPlayoffBracket } from '@/lib/api/playoffs';

export function usePlayoffBracket(season?: string) {
  return useQuery({
    queryKey: ['playoffBracket', season],
    queryFn: () => fetchPlayoffBracket(season!),
    enabled: !!season,
    staleTime: 1000 * 60 * 60,
  });
}
