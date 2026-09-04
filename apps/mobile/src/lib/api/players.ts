import { supabase } from '@/lib/supabase';
import type {
  Player,
  PlayerCareerEntry,
  PlayerGameLogEntry,
  PlayerSeasonStats,
} from '@/types/domain';
import type { Database } from '@/types/database';

type PlayerRow = Database['public']['Tables']['players']['Row'];
type GameLogRow = Database['public']['Tables']['player_game_log']['Row'];
type SeasonStatsRow = Database['public']['Tables']['player_season_stats']['Row'];

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    teamId: row.team_id ?? '',
    position: row.position ?? undefined,
    jerseyNumber: row.jersey_number ?? undefined,
    photoUrl: row.photo_url ?? undefined,
  };
}

export async function fetchPlayersByTeam(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('last_name');

  if (error) throw error;
  return data.map(mapPlayer);
}

function mapSeasonStats(row: SeasonStatsRow): PlayerSeasonStats {
  return {
    playerId: row.player_id,
    season: row.season,
    gamesPlayed: row.games_played ?? 0,
    minutes: row.minutes ?? 0,
    points: row.points ?? 0,
    rebounds: row.rebounds ?? 0,
    assists: row.assists ?? 0,
    steals: row.steals ?? 0,
    blocks: row.blocks ?? 0,
    fieldGoalPct: row.field_goal_pct ?? 0,
    threePointPct: row.three_point_pct ?? 0,
    freeThrowPct: row.free_throw_pct ?? 0,
  };
}

export async function fetchSeasonStatsByTeam(
  teamId: string,
): Promise<Map<string, PlayerSeasonStats>> {
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id')
    .eq('team_id', teamId);

  if (playersError) throw playersError;
  const playerIds = players.map((p) => p.id);

  if (playerIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('player_season_stats')
    .select('*')
    .in('player_id', playerIds);

  if (error) throw error;

  const map = new Map<string, PlayerSeasonStats>();
  for (const row of data) {
    map.set(row.player_id, mapSeasonStats(row));
  }
  return map;
}

function mapGameLog(row: GameLogRow, fallbackDate?: string | null): PlayerGameLogEntry {
  const dateStr = row.game_date ?? fallbackDate ?? null;

  return {
    playerId: row.player_id,
    gameId: row.game_id,
    gameDate: dateStr ? new Date(dateStr) : null,
    season: row.season ?? undefined,
    matchup: row.matchup ?? undefined,
    isHome: row.is_home ?? undefined,
    opponentAbbreviation: row.opponent_abbreviation ?? undefined,
    winLoss: (row.win_loss as 'W' | 'L') ?? undefined,
    minutes: row.minutes ?? 0,
    points: row.points ?? 0,
    rebounds: row.rebounds ?? 0,
    assists: row.assists ?? 0,
    steals: row.steals ?? 0,
    blocks: row.blocks ?? 0,
    turnovers: row.turnovers ?? 0,
    fgMade: row.fg_made ?? 0,
    fgAttempted: row.fg_attempted ?? 0,
    fg3Made: row.fg3_made ?? 0,
    fg3Attempted: row.fg3_attempted ?? 0,
    ftMade: row.ft_made ?? 0,
    ftAttempted: row.ft_attempted ?? 0,
    plusMinus: row.plus_minus ?? 0,
  };
}

export async function fetchPlayerById(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase.from('players').select('*').eq('id', playerId).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapPlayer(data);
}

export async function fetchPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats | null> {
  const { data, error } = await supabase
    .from('player_season_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSeasonStats(data) : null;
}

export async function fetchPlayerGameLog(playerId: string): Promise<PlayerGameLogEntry[]> {
  const { data: logData, error: logError } = await supabase
    .from('player_game_log')
    .select('*')
    .eq('player_id', playerId)
    .order('game_date', { ascending: false });

  if (logError) throw logError;
  if (!logData || logData.length === 0) return [];

  const gameIds = logData.map((l) => l.game_id);
  const { data: gamesData, error: gamesError } = await supabase
    .from('games')
    .select(
      `id, starts_at, score_home, score_away,
       home_team:teams!home_team_id(id, abbreviation, logo_url),
       away_team:teams!away_team_id(id, abbreviation, logo_url)`,
    )
    .in('id', gameIds);

  if (gamesError) throw gamesError;

  const gamesMap = new Map((gamesData ?? []).map((g) => [g.id, g]));

  return logData.map((row) => {
    const game = gamesMap.get(row.game_id);
    const entry = mapGameLog(row, game?.starts_at);

    if (game) {
      const home = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
      const away = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;

      entry.game = {
        homeTeamId: home?.id ?? '',
        awayTeamId: away?.id ?? '',
        homeTeamAbbr: home?.abbreviation ?? '',
        awayTeamAbbr: away?.abbreviation ?? '',
        homeTeamLogo: home?.logo_url ?? undefined,
        awayTeamLogo: away?.logo_url ?? undefined,
        scoreHome: game.score_home ?? 0,
        scoreAway: game.score_away ?? 0,
      };
    }

    return entry;
  });
}

/** Convierte a number respetando el null (temporada sin empezar). */
function num(value: number | string | null): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/**
 * Carrera completa: una fila por temporada y equipo.
 * Un jugador traspasado a mitad de temporada tiene dos filas del mismo año,
 * cada una con las medias de esa etapa.
 */
export async function fetchPlayerCareer(playerId: string): Promise<PlayerCareerEntry[]> {
  const { data, error } = await supabase.rpc('player_career', {
    target_player_id: playerId,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    season: row.season ?? '',
    teamId: row.team_id ?? '',
    teamName: row.team_name ?? '',
    teamAbbreviation: row.team_abbreviation ?? '',
    teamLogoUrl: row.team_logo_url ?? undefined,
    gamesPlayed: row.games_played ?? null,
    minutes: num(row.minutes),
    points: num(row.points),
    rebounds: num(row.rebounds),
    assists: num(row.assists),
    steals: num(row.steals),
    blocks: num(row.blocks),
    turnovers: num(row.turnovers),
    fieldGoalPct: num(row.field_goal_pct),
    threePointPct: num(row.three_point_pct),
    freeThrowPct: num(row.free_throw_pct),
    teamCount: row.team_count ?? 1,
    wonChampionship: row.won_championship ?? false,
  }));
}
