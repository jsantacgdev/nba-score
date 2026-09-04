import { supabase } from '@/lib/supabase';
import type { LeagueStanding, StandingsSeason } from '@/types/domain';

/**
 * Temporadas que tienen clasificación disponible, de más nueva a más vieja.
 * Sale de los partidos realmente cargados, así que el selector se amplía
 * solo según se vayan sincronizando temporadas.
 */
export async function fetchStandingsSeasons(): Promise<StandingsSeason[]> {
  const { data, error } = await supabase.rpc('standings_seasons');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    season: row.season,
    gamesCount: row.games_count ?? 0,
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
