import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addFavoriteTeam, getFavoriteTeamIds, removeFavoriteTeam } from '@/lib/favorites';

const FAVORITES_KEY = ['favorites', 'teams'];

export function useFavoriteTeamIds() {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getFavoriteTeamIds,
    staleTime: Infinity,
  });
}

export function useIsFavoriteTeam(teamId: string) {
  const { data } = useFavoriteTeamIds();
  return (data ?? []).includes(teamId);
}

export function useToggleFavoriteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, isFavorite }: { teamId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        return removeFavoriteTeam(teamId);
      }
      return addFavoriteTeam(teamId);
    },
    onSuccess: (newList) => {
      queryClient.setQueryData(FAVORITES_KEY, newList);
    },
  });
}
