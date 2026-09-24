import { supabase } from '@/lib/supabase';
import type { ModelRecord } from '@/types/domain';

export async function fetchModelRecord(): Promise<ModelRecord | null> {
  const { data, error } = await supabase.rpc('model_record');

  if (error) throw error;

  const fila = (data ?? [])[0];
  if (!fila) return null;

  return {
    season: fila.season,
    resolved: fila.resueltos,
    hits: fila.aciertos,
    accuracy: Number(fila.acierto),
    pending: fila.pendientes,
  };
}
