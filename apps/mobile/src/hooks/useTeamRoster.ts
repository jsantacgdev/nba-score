import { useQuery } from '@tanstack/react-query';
import { fetchPlayersByTeam } from '@/lib/api/players';
import { fetchTeamById } from '@/lib/api/teams';
import { fetchSeasonStatsByTeam } from '@/lib/api/players';

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeamById(teamId),
    enabled: !!teamId,
  });
}

export function useTeamRoster(teamId: string) {
  return useQuery({
    queryKey: ['roster', teamId],
    queryFn: () => fetchPlayersByTeam(teamId),
    enabled: !!teamId,
  });
}

export function useTeamSeasonStats(teamId: string) {
  return useQuery({
    queryKey: ['seasonStats', teamId],
    queryFn: () => fetchSeasonStatsByTeam(teamId),
    enabled: !!teamId,
  });
}
