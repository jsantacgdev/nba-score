import { useQuery } from '@tanstack/react-query';
import { fetchWinProbability } from '@/lib/api/winProbability';

export function useWinProbability(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['winProbability', gameId],
    queryFn: () => fetchWinProbability(gameId!),
    enabled: !!gameId && activo,
    staleTime: 1000 * 60 * 30,
  });
}
