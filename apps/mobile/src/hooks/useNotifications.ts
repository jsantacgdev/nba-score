import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  avisosProgramados,
  cancelarTodos,
  guardarActivadas,
  notificacionesActivadas,
  pedirPermiso,
  reprogramarAvisos,
} from '@/lib/notifications';
import { useFavoriteTeamIds } from '@/hooks/useFavorites';

export function useNotificationsEnabled() {
  return useQuery({
    queryKey: ['notificationsEnabled'],
    queryFn: notificacionesActivadas,
    staleTime: Infinity,
  });
}

export function useScheduledCount() {
  return useQuery({
    queryKey: ['scheduledNotifications'],
    queryFn: avisosProgramados,
    staleTime: 1000 * 30,
  });
}

/**
 * Enciende o apaga los avisos.
 *
 * Al encender pide permiso primero: si el sistema lo niega, no se guarda
 * la preferencia, para que el interruptor no quede encendido sin que
 * llegue ningun aviso.
 */
export function useToggleNotifications() {
  const queryClient = useQueryClient();
  const { data: favoriteIds = [] } = useFavoriteTeamIds();

  return useMutation({
    mutationFn: async (activar: boolean) => {
      if (!activar) {
        await guardarActivadas(false);
        await cancelarTodos();
        return { activadas: false, avisos: 0 };
      }

      const concedido = await pedirPermiso();
      if (!concedido) return { activadas: false, avisos: 0, denegado: true };

      await guardarActivadas(true);
      const avisos = await reprogramarAvisos(favoriteIds);
      return { activadas: true, avisos };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsEnabled'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications'] });
    },
  });
}

/** Vuelve a programar, por ejemplo al cambiar de equipos favoritos. */
export function useRescheduleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamIds: string[]) => reprogramarAvisos(teamIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications'] });
    },
  });
}
