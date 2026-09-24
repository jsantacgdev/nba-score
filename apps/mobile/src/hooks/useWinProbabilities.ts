import { useQuery } from '@tanstack/react-query';
import { fetchWinProbabilities } from '@/lib/api/winProbabilities';

export function useWinProbabilities(ids: string[]) {
  const clave = [...ids].sort();

  return useQuery({
    queryKey: ['winProbabilities', clave.join(',')],
    queryFn: () => fetchWinProbabilities(clave),
    enabled: clave.length > 0,
    staleTime: 1000 * 60 * 30,
  });
}
