import { useQuery } from '@tanstack/react-query';
import { fetchNovedades } from '@/lib/api/news';
import type { FeedKind } from '@/types/domain';

/**
 * Cinco minutos de cache: es lo unico de la app que cambia durante el dia,
 * pero el feed de ESPN tampoco se mueve mas rapido que eso.
 */
export function useNovedades(kind?: FeedKind, limit = 60) {
  return useQuery({
    queryKey: ['novedades', kind ?? 'todo', limit],
    queryFn: () => fetchNovedades(limit, kind),
    staleTime: 1000 * 60 * 5,
  });
}
