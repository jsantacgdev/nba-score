import { supabase } from '@/lib/supabase';
import type { Team, TeamSeasonPlayer } from '@/types/domain';
import type { Database } from '@/types/database';
import type { Game } from '@/types/domain';

type TeamRow = Database['public']['Tables']['teams']['Row'];

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    abbreviation: row.abbreviation,
    city: row.city,
    conference: row.conference as 'East' | 'West',
    logoUrl: row.logo_url ?? undefined,
  };
}

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('full_name');

  if (error) throw error;
  return data.map(mapTeam);
}

export async function fetchTeamById(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return mapTeam(data);
}

export async function fetchTeamGames(teamId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `
      id,
      starts_at,
      score_home,
      score_away,
      status,
      period,
      time_remaining,
      home_team:teams!home_team_id(id, name, full_name, city, abbreviation, conference, logo_url),
      away_team:teams!away_team_id(id, name, full_name, city, abbreviation, conference, logo_url)
    `,
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('starts_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const home = Array.isArray(row.home_team) ? row.home_team[0] : row.home_team;
    const away = Array.isArray(row.away_team) ? row.away_team[0] : row.away_team;

    return {
      id: row.id,
      startsAt: new Date(row.starts_at),
      status: row.status as Game['status'],
      period: row.period ?? 0,
      timeRemaining: row.time_remaining ?? undefined,
      scoreHome: row.score_home ?? 0,
      scoreAway: row.score_away ?? 0,
      homeTeam: {
        id: home?.id ?? '',
        name: home?.name ?? '',
        fullName: home?.full_name ?? '',
        city: home?.city ?? '',
        abbreviation: home?.abbreviation ?? '',
        conference: (home?.conference ?? 'East') as 'East' | 'West',
        logoUrl: home?.logo_url ?? undefined,
      },
      awayTeam: {
        id: away?.id ?? '',
        name: away?.name ?? '',
        fullName: away?.full_name ?? '',
        city: away?.city ?? '',
        abbreviation: away?.abbreviation ?? '',
        conference: (away?.conference ?? 'East') as 'East' | 'West',
        logoUrl: away?.logo_url ?? undefined,
      },
    };
  });
}

function num(value: number | string | null): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/** Plantilla de un equipo en una temporada concreta, con las medias de ese año. */
export async function fetchTeamSeasonRoster(
  teamId: string,
  season: string,
): Promise<TeamSeasonPlayer[]> {
  const { data, error } = await supabase.rpc('team_season_roster', {
    target_team_id: teamId,
    target_season: season,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    playerId: row.player_id ?? '',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    photoUrl: row.photo_url ?? undefined,
    jerseyNumber: row.jersey_number ?? undefined,
    position: row.player_position ?? undefined,
    gamesPlayed: row.games_played ?? null,
    minutes: num(row.minutes),
    points: num(row.points),
    rebounds: num(row.rebounds),
    assists: num(row.assists),
    steals: num(row.steals),
    blocks: num(row.blocks),
    wonChampionship: row.won_championship ?? false,
  }));
}
