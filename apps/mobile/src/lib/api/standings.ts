import { supabase } from '@/lib/supabase';
import type { LeagueStanding, StandingsSeason } from '@/types/domain';

export async function fetchStandingsSeasons(): Promise<StandingsSeason[]> {
  const { data, error } = await supabase.rpc('standings_seasons');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    season: row.season,
    gamesCount: row.games_count ?? 0,
    champion: row.champion_team_id
      ? {
          teamId: row.champion_team_id,
          name: row.champion_name ?? '',
          abbreviation: row.champion_abbreviation ?? '',
          logoUrl: row.champion_logo_url ?? undefined,
        }
      : undefined,
  }));
}

export async function fetchStandingsBySeason(season: string): Promise<LeagueStanding[]> {
  const { data, error } = await supabase.rpc('season_standings', {
    target_season: season,
  });

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
    winPercentage: Number(row.win_percentage ?? 0),
    pointDifferential: Number(row.point_differential ?? 0),
    wonChampionship: row.won_championship ?? false,
  }));
}
