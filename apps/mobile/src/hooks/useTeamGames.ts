import { useQuery } from '@tanstack/react-query';
import { fetchTeamGames } from '@/lib/api/teams';

export function useTeamGames(teamId: string) {
  return useQuery({
    queryKey: ['teamGames', teamId],
    queryFn: () => fetchTeamGames(teamId),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10,
  });
}
