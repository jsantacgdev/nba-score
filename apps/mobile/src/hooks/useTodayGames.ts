import { useQuery } from '@tanstack/react-query';
import { fetchGamesByDate, fetchMostRecentGameDate } from '@/lib/api/games';

/**
 * Devuelve los partidos del día más reciente con actividad.
 * Si hoy hay partidos, los devuelve. Si no, los del último día con partidos.
 */
export function useTodayGames() {
  return useQuery({
    queryKey: ['todayGames'],
    queryFn: async () => {
      const today = new Date();
      const games = await fetchGamesByDate(today);

      if (games.length > 0) {
        return { date: today, games, isToday: true };
      }

      const lastDate = await fetchMostRecentGameDate();
      if (!lastDate) {
        return { date: today, games: [], isToday: true };
      }

      const lastGames = await fetchGamesByDate(lastDate);
      return { date: lastDate, games: lastGames, isToday: false };
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
