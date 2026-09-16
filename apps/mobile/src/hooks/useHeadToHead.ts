import { useQuery } from '@tanstack/react-query';
import { fetchHeadToHead } from '@/lib/api/headToHead';
import type { Game } from '@/types/domain';

/**
 * El historial entre dos equipos.
 *
 * Son partidos ya jugados, asi que una vez pedido no cambia mientras se
 * mira el partido. Se carga solo al abrir la pestaña (`activo`) para no
 * gastar una consulta de doscientas filas en quien solo venia a ver el
 * box score.
 */
export function useHeadToHead(game?: Game, activo = true) {
  return useQuery({
    queryKey: ['headToHead', game?.id],
    queryFn: () => fetchHeadToHead(game!),
    enabled: !!game && activo,
    staleTime: 1000 * 60 * 60,
  });
}
