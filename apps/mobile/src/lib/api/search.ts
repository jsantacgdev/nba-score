import { supabase } from '@/lib/supabase';
import type { SearchResult, SearchResultPlayer, SearchResultTeam } from '@/types/domain';

export async function searchAll(query: string): Promise<{
  teams: SearchResultTeam[];
  players: SearchResultPlayer[];
}> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { teams: [], players: [] };
  }

  // Ejecutamos ambas búsquedas en paralelo
  const [teamsResult, playersResult] = await Promise.all([
    supabase.rpc('search_teams', { query: trimmed, max_results: 10 }),
    supabase.rpc('search_players', { query: trimmed, max_results: 20 }),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (playersResult.error) throw playersResult.error;

  const teams: SearchResultTeam[] = (teamsResult.data ?? []).map((row) => ({
    type: 'team',
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    abbreviation: row.abbreviation,
    city: row.city,
    conference: row.conference as 'East' | 'West',
    logoUrl: row.logo_url ?? undefined,
  }));

  const players: SearchResultPlayer[] = (playersResult.data ?? []).map((row) => ({
    type: 'player',
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    teamId: row.team_id ?? undefined,
    teamName: row.team_name ?? undefined,
    teamAbbreviation: row.team_abbreviation ?? undefined,
    teamLogoUrl: row.team_logo_url ?? undefined,
    position: row.player_position ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    isActive: row.is_active ?? true,
  }));

  return { teams, players };
}
