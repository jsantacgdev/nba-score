import { useQuery } from '@tanstack/react-query';
import { fetchRecentGameDays, fetchUpcomingGameDays } from '@/lib/api/games';
import { startOfDay } from '@/lib/format';

export function useRecentDays(referenceDate: Date, daysCount: number = 4) {
  const dayKey = startOfDay(referenceDate).toISOString();

  return useQuery({
    queryKey: ['recentDays', dayKey, daysCount],
    queryFn: () => fetchRecentGameDays(referenceDate, daysCount),
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpcomingDays(referenceDate: Date, daysCount: number = 4) {
  const dayKey = startOfDay(referenceDate).toISOString();

  return useQuery({
    queryKey: ['upcomingDays', dayKey, daysCount],
    queryFn: () => fetchUpcomingGameDays(referenceDate, daysCount),
    staleTime: 1000 * 60 * 10,
  });
}
