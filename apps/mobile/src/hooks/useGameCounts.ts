import { useQuery } from '@tanstack/react-query';
import { fetchGameCountsByDateRange } from '@/lib/api/games';
import { addDays, startOfDay } from '@/lib/format';

export function useGameCounts(
  referenceDate: Date,
  daysBack: number = 14,
  daysForward: number = 14,
) {
  const start = startOfDay(addDays(referenceDate, -daysBack));
  const end = startOfDay(addDays(referenceDate, daysForward + 1));

  return useQuery({
    queryKey: ['gameCounts', start.toISOString(), end.toISOString()],
    queryFn: () => fetchGameCountsByDateRange(start, end),
    staleTime: 1000 * 60 * 10,
  });
}
