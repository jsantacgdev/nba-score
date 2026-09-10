import { useQuery } from '@tanstack/react-query';
import { fetchStandingsBySeason, fetchStandingsSeasons } from '@/lib/api/standings';

export function useStandingsSeasons() {
  return useQuery({
    queryKey: ['standingsSeasons'],
    queryFn: fetchStandingsSeasons,
    staleTime: 1000 * 60 * 60,
  });
}

export function useStandings(season?: string) {
  return useQuery({
    queryKey: ['standings', season],
    queryFn: () => fetchStandingsBySeason(season!),
    enabled: !!season,
    staleTime: 1000 * 60 * 10,
  });
}
