import { useQuery } from '@tanstack/react-query';
import { fetchNovedades } from '@/lib/api/news';
import type { FeedKind } from '@/types/domain';

/** Cada cuanto se vuelve a mirar mientras la pestaña esta delante. */
const REFRESCO_MS = 1000 * 60 * 5;

/**
 * El hilo de novedades.
 *
 * Es lo unico de la aplicacion que cambia durante el dia, asi que se
 * refresca solo mientras la pestaña esta en pantalla. Fuera de ella no,
 * porque expo-router mantiene las pestañas montadas y si no se pararia a
 * pedir datos cada cinco minutos aunque el usuario este en otra.
 *
 * Quien carga las noticias es la accion sync_espn.yml, cada seis horas.
 * Esto solo mira si hay algo nuevo en nuestra base; a ESPN no se le llama
 * desde el movil.
 */
export function useNovedades(kind?: FeedKind, limit = 60, activo = true) {
  return useQuery({
    queryKey: ['novedades', kind ?? 'todo', limit],
    queryFn: () => fetchNovedades(limit, kind),
    staleTime: REFRESCO_MS,
    refetchInterval: activo ? REFRESCO_MS : false,
  });
}
