import { supabase } from '@/lib/supabase';
import type { CareerHigh } from '@/types/domain';

export async function fetchCareerHighs(playerId: string): Promise<CareerHigh[]> {
  const { data, error } = await supabase.rpc('player_career_highs', {
    target_player_id: playerId,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    stat: row.stat as CareerHigh['stat'],
    value: row.valor ?? 0,
    gameId: row.game_id ?? undefined,
    date: row.game_date ? new Date(row.game_date) : undefined,
    season: row.season ?? undefined,
    opponentAbbreviation: row.opponent_abbreviation ?? undefined,
    seasonType: row.season_type ?? undefined,
  }));
}
