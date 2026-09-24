import { supabase } from '@/lib/supabase';

export async function fetchWinProbabilities(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};

  const { data, error } = await supabase.rpc('games_win_probability', { target_ids: ids });

  if (error) throw error;

  const porPartido: Record<string, number> = {};
  for (const fila of data ?? []) {
    if (fila.game_id === null || fila.prob_home === null) continue;
    porPartido[fila.game_id] = Number(fila.prob_home);
  }
  return porPartido;
}
