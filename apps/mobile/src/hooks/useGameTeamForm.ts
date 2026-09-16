import { useQuery } from '@tanstack/react-query';
import { fetchGameTeamForm } from '@/lib/api/teamForm';

/**
 * Como llegan los dos equipos a un partido.
 *
 * Va en la misma pestaña que el cara a cara y se pide igual: solo al
 * abrirla. Los numeros son a fecha del partido, asi que en uno ya jugado
 * no cambian nunca; en uno por jugar se mueven con cada jornada, de ahi
 * la media hora de vida.
 */
export function useGameTeamForm(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['gameTeamForm', gameId],
    queryFn: () => fetchGameTeamForm(gameId!),
    enabled: !!gameId && activo,
    staleTime: 1000 * 60 * 30,
  });
}
