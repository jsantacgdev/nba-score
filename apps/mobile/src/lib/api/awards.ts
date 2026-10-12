import { supabase } from '@/lib/supabase';
import type { AwardHistoryEntry } from '@/types/domain';

export async function fetchAwardHistory(award: string): Promise<AwardHistoryEntry[]> {
  const { data, error } = await supabase.rpc('award_history', { target_award: award });
  if (error) throw error;

  return (data ?? []).map((fila) => ({
    season: fila.season,
    playerId: fila.player_id ?? undefined,
    playerName: fila.player_name ?? undefined,
    photoUrl: fila.photo_url ?? undefined,
    teamId: fila.team_id ?? undefined,
    teamName: fila.team_name ?? undefined,
    teamAbbreviation: fila.team_abbreviation ?? undefined,
    teamLogoUrl: fila.team_logo_url ?? undefined,
  }));
}
