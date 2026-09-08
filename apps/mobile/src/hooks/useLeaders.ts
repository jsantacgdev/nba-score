import { useQuery } from '@tanstack/react-query';
import { fetchLatestStatsSeason, fetchSeasonLeaders } from '@/lib/api/leaders';
import type { LeaderStat } from '@/types/domain';

export function useSeasonLeaders(season: string | undefined, stat: LeaderStat) {
  return useQuery({
    queryKey: ['seasonLeaders', season, stat],
    queryFn: () => fetchSeasonLeaders(season!, stat),
    enabled: !!season,
    staleTime: 1000 * 60 * 60,
  });
}

export function useLatestStatsSeason() {
  return useQuery({
    queryKey: ['latestStatsSeason'],
    queryFn: fetchLatestStatsSeason,
    staleTime: 1000 * 60 * 60,
  });
}
