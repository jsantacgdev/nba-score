import { supabase } from '@/lib/supabase';
import type { LeagueStanding } from '@/types/domain';

export async function fetchStandings(): Promise<LeagueStanding[]> {
  const { data, error } = await supabase
    .from('league_standings')
    .select('*')
    .order('win_percentage', { ascending: false })
    .order('wins', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    teamId: row.team_id ?? '',
    name: row.name ?? '',
    fullName: row.full_name ?? '',
    abbreviation: row.abbreviation ?? '',
    city: row.city ?? '',
    conference: (row.conference ?? 'East') as 'East' | 'West',
    division: row.division ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    gamesPlayed: row.games_played ?? 0,
    winPercentage: row.win_percentage ?? 0,
    pointDifferential: row.point_differential ?? 0,
  }));
}
