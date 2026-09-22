import { useQuery } from '@tanstack/react-query';
import { fetchGameTeamForm } from '@/lib/api/teamForm';

export function useGameTeamForm(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['gameTeamForm', gameId],
    queryFn: () => fetchGameTeamForm(gameId!),
    enabled: !!gameId && activo,
    staleTime: 1000 * 60 * 30,
  });
}
