import { useQuery } from '@tanstack/react-query';
import { fetchModelRecord } from '@/lib/api/modelRecord';

export function useModelRecord(activo = true) {
  return useQuery({
    queryKey: ['modelRecord'],
    queryFn: fetchModelRecord,
    enabled: activo,
    staleTime: 1000 * 60 * 60,
  });
}
