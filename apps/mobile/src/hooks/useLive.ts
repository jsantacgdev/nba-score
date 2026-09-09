import { useQuery } from '@tanstack/react-query';
import {
  fetchLiveGame,
  fetchLiveScoreboard,
  fetchPlayerPeriods,
} from '@/lib/api/live';
import { fetchStartingLineups } from '@/lib/api/starters';

/**
 * Ritmos de refresco, elegidos por como transcurre un partido.
 *
 * El marcador va a 15 segundos porque una posesion dura 24, y bajando de
 * ahi se recogen tambien los tiros libres sin duplicar peticiones.
 *
 * La alineacion cambia mucho mas despacio, asi que con un minuto basta.
 *
 * Los puntos por cuarto van a minuto y medio: son ocho actualizaciones por
 * cuarto y su feed pesa 450 KB, diez veces mas que el box score.
 */
const REFRESCO_MARCADOR = 15_000;
const REFRESCO_PARTIDO = 15_000;
const REFRESCO_ALINEACION = 60_000;
const REFRESCO_CUARTOS = 90_000;

/** Marcadores de la jornada. Solo insiste si hay algo en juego. */
export function useLiveScoreboard(activo = true) {
  return useQuery({
    queryKey: ['liveScoreboard'],
    queryFn: fetchLiveScoreboard,
    enabled: activo,
    refetchInterval: (query) => {
      const partidos = query.state.data ?? [];
      return partidos.some((g) => g.status === 'live') ? REFRESCO_MARCADOR : false;
    },
    staleTime: 0,
  });
}

/** Estado de un partido concreto. */
export function useLiveGame(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['liveGame', gameId],
    queryFn: () => fetchLiveGame(gameId!),
    enabled: !!gameId && activo,
    // Terminado el partido deja de tener sentido insistir
    refetchInterval: (query) =>
      query.state.data?.status === 'live' ? REFRESCO_PARTIDO : false,
    staleTime: 0,
  });
}

/**
 * Quien esta en pista.
 *
 * Sale del mismo box score que el marcador, pero con su propia consulta y
 * su propio ritmo: la alineacion no necesita ir a 15 segundos y asi la
 * pista no se repinta cada vez que alguien anota.
 */
export function useLiveLineup(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['liveLineup', gameId],
    queryFn: () => fetchLiveGame(gameId!),
    enabled: !!gameId && activo,
    refetchInterval: (query) =>
      query.state.data?.status === 'live' ? REFRESCO_ALINEACION : false,
    staleTime: REFRESCO_ALINEACION,
  });
}

/** Puntos por cuarto de cada jugador, calculados del jugada a jugada. */
export function usePlayerPeriods(gameId?: string, activo = true) {
  return useQuery({
    queryKey: ['playerPeriods', gameId],
    queryFn: () => fetchPlayerPeriods(gameId!),
    enabled: !!gameId && activo,
    refetchInterval: REFRESCO_CUARTOS,
    staleTime: REFRESCO_CUARTOS,
  });
}

/**
 * Quinteto inicial guardado en la base.
 *
 * No cambia nunca una vez jugado el partido, asi que se cachea largo y no
 * se refresca.
 */
export function useStartingLineups(gameId?: string) {
  return useQuery({
    queryKey: ['startingLineups', gameId],
    queryFn: () => fetchStartingLineups(gameId!),
    enabled: !!gameId,
    staleTime: Infinity,
  });
}
