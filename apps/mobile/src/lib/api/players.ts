import { supabase } from '@/lib/supabase';
import type { Player, PlayerGameLogEntry, PlayerSeasonStats } from '@/types/domain';
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
  // Primero obtenemos los IDs de jugadores del equipo
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

function mapGameLog(row: GameLogRow): PlayerGameLogEntry {
  return {
    playerId: row.player_id,
    gameId: row.game_id,
    gameDate: new Date(row.game_date),
    season: row.season,
    matchup: row.matchup,
    isHome: row.is_home,
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
  // 1. Traemos el game log del jugador
  const { data: logData, error: logError } = await supabase
    .from('player_game_log')
    .select('*')
    .eq('player_id', playerId)
    .order('game_date', { ascending: false });

  if (logError) throw logError;
  if (!logData || logData.length === 0) return [];

  // 2. Traemos los partidos correspondientes con datos de ambos equipos
  const gameIds = logData.map((l) => l.game_id);
  const { data: gamesData, error: gamesError } = await supabase
    .from('games')
    .select(
      `id, score_home, score_away,
       home_team:teams!home_team_id(id, abbreviation, logo_url),
       away_team:teams!away_team_id(id, abbreviation, logo_url)`,
    )
    .in('id', gameIds);

  if (gamesError) throw gamesError;

  // 3. Indexamos los partidos por id para cruzarlos rápido
  const gamesMap = new Map((gamesData ?? []).map((g) => [g.id, g]));

  // 4. Combinamos
  return logData.map((row) => {
    const game = gamesMap.get(row.game_id);
    const entry = mapGameLog(row);

    if (game) {
      // Supabase devuelve las relaciones; pueden venir como objeto
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
