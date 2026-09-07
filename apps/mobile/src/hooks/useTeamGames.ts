import { useQuery } from '@tanstack/react-query';
import { fetchTeamGames } from '@/lib/api/teams';

export function useTeamGames(teamId: string, season?: string) {
  return useQuery({
    queryKey: ['teamGames', teamId, season],
    queryFn: () => fetchTeamGames(teamId, season),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10,
  });
}
