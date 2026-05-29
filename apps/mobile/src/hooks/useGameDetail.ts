import { useQuery } from '@tanstack/react-query';
import { fetchGameDetail } from '@/lib/api/gameDetail';

export function useGameDetail(gameId: string) {
  return useQuery({
    queryKey: ['gameDetail', gameId],
    queryFn: () => fetchGameDetail(gameId),
    enabled: !!gameId,
  });
}
