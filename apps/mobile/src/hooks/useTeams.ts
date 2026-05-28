import { useQuery } from '@tanstack/react-query';
import { fetchTeams } from '@/lib/api/teams';

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
  });
}
