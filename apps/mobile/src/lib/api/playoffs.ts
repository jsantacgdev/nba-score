import { supabase } from '@/lib/supabase';
import type { PlayoffSeries } from '@/types/domain';

export async function fetchPlayoffBracket(season: string): Promise<PlayoffSeries[]> {
  const { data, error } = await supabase.rpc('playoff_bracket', { target_season: season });

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    round: fila.ronda,
    conference: fila.conferencia,
    order: fila.orden,
    teamA: {
      id: fila.team_a_id,
      abbreviation: fila.team_a_abbreviation,
      name: fila.team_a_name,
      logoUrl: fila.team_a_logo_url ?? undefined,
      wins: fila.wins_a,
    },
    teamB: {
      id: fila.team_b_id,
      abbreviation: fila.team_b_abbreviation,
      name: fila.team_b_name,
      logoUrl: fila.team_b_logo_url ?? undefined,
      wins: fila.wins_b,
    },
    decided: fila.decidida,
    champion: fila.campeon,
  }));
}
