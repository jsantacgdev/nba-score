import { useQuery } from '@tanstack/react-query';
import { fetchHeadToHead } from '@/lib/api/headToHead';
import type { Game } from '@/types/domain';

export function useHeadToHead(game?: Game, activo = true) {
  return useQuery({
    queryKey: ['headToHead', game?.id],
    queryFn: () => fetchHeadToHead(game!),
    enabled: !!game && activo,
    staleTime: 1000 * 60 * 60,
  });
}
