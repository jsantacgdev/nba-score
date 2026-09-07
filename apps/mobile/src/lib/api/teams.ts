import { supabase } from '@/lib/supabase';
import type { Team, TeamSeason, TeamSeasonPlayer, TeamTitle } from '@/types/domain';
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

/**
 * Partidos de un equipo en una temporada.
 *
 * Pasa por la funcion team_games en lugar de consultar la tabla porque
 * necesita dos datos que no estan en el partido: el balance de la
 * eliminatoria y si ese partido decidio el titulo.
 */
export async function fetchTeamGames(teamId: string, season?: string): Promise<Game[]> {
  if (!season) return [];

  const { data, error } = await supabase.rpc('team_games', {
    target_team_id: teamId,
    target_season: season,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id ?? '',
    startsAt: new Date(row.starts_at ?? ''),
    status: row.status as Game['status'],
    seasonType: (row.season_type ?? 'regular') as Game['seasonType'],
    period: row.period ?? 0,
    timeRemaining: row.time_remaining ?? undefined,
    scoreHome: row.score_home ?? 0,
    scoreAway: row.score_away ?? 0,
    seriesWins:
      row.series_wins_home !== null && row.series_wins_away !== null
        ? { home: row.series_wins_home, away: row.series_wins_away }
        : undefined,
    playoffRound: row.playoff_round ?? undefined,
    titleDecider: row.title_decider ?? false,
    homeTeam: {
      id: row.home_team_id ?? '',
      name: row.home_name ?? '',
      fullName: row.home_name ?? '',
      city: '',
      abbreviation: row.home_abbreviation ?? '',
      conference: 'East' as const,
      logoUrl: row.home_logo_url ?? undefined,
    },
    awayTeam: {
      id: row.away_team_id ?? '',
      name: row.away_name ?? '',
      fullName: row.away_name ?? '',
      city: '',
      abbreviation: row.away_abbreviation ?? '',
      conference: 'East' as const,
      logoUrl: row.away_logo_url ?? undefined,
    },
  }));
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

/** Temporadas con plantilla registrada de un equipo, marcando sus anillos. */
export async function fetchTeamSeasons(teamId: string): Promise<TeamSeason[]> {
  const { data, error } = await supabase.rpc('team_seasons', {
    target_team_id: teamId,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    season: row.season ?? '',
    players: row.players ?? 0,
    wonChampionship: row.won_championship ?? false,
  }));
}

/** Titulos de un equipo: campeonatos NBA y NBA Cup. */
export async function fetchTeamPalmares(teamId: string): Promise<TeamTitle[]> {
  const { data, error } = await supabase.rpc('team_palmares', {
    target_team_id: teamId,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    competition: (row.competition ?? 'nba') as TeamTitle['competition'],
    season: row.season ?? '',
    year: row.year ?? 0,
  }));
}
