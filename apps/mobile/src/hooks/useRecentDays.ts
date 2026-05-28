import { useQuery } from '@tanstack/react-query';
import { fetchRecentGameDays } from '@/lib/api/games';
import { startOfDay } from '@/lib/format';

export function useRecentDays(referenceDate: Date, daysCount: number = 4) {
  const dayKey = startOfDay(referenceDate).toISOString();

  return useQuery({
    queryKey: ['recentDays', dayKey, daysCount],
    queryFn: () => fetchRecentGameDays(referenceDate, daysCount),
    staleTime: 1000 * 60 * 10,
  });
}
