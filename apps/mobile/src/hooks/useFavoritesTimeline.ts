import { useQuery } from '@tanstack/react-query';
import { useFavoriteTeamIds } from '@/hooks/useFavorites';
import { fetchGamesByTeams } from '@/lib/api/games';

const DAYS_BACK = 7;
const DAYS_FORWARD = 14;

export function useFavoritesTimeline() {
  const { data: favoriteIds = [] } = useFavoriteTeamIds();

  const sortedIds = [...favoriteIds].sort();

  return useQuery({
    queryKey: ['favoritesTimeline', sortedIds],
    queryFn: () => fetchGamesByTeams(favoriteIds, DAYS_BACK, DAYS_FORWARD),
    enabled: favoriteIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
