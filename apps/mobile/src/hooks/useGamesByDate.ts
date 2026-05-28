import { useQuery } from '@tanstack/react-query';
import { fetchGamesByDate } from '@/lib/api/games';
import { startOfDay } from '@/lib/format';

export function useGamesByDate(date: Date) {
  const dayKey = startOfDay(date).toISOString();

  return useQuery({
    queryKey: ['gamesByDate', dayKey],
    queryFn: () => fetchGamesByDate(date),
    staleTime: 1000 * 60 * 5,
  });
}
