import { supabase } from '@/lib/supabase';
import { calculateGameScore } from '@/lib/gameScore';
import type { Game, GameBoxScoreEntry, GameDetail } from '@/types/domain';
import type { Database } from '@/types/database';

type GameLogRow = Database['public']['Tables']['player_game_log']['Row'];

async function fetchGame(gameId: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `*,
       home_team:teams!home_team_id(*),
       away_team:teams!away_team_id(*)`,
    )
    .eq('id', gameId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const home = Array.isArray(data.home_team) ? data.home_team[0] : data.home_team;
  const away = Array.isArray(data.away_team) ? data.away_team[0] : data.away_team;
  if (!home || !away) return null;

  return {
    id: data.id,
    homeTeam: {
      id: home.id,
      name: home.name,
      fullName: home.full_name,
      abbreviation: home.abbreviation,
      city: home.city,
      conference: home.conference as 'East' | 'West',
      logoUrl: home.logo_url ?? undefined,
    },
    awayTeam: {
      id: away.id,
      name: away.name,
      fullName: away.full_name,
      abbreviation: away.abbreviation,
      city: away.city,
      conference: away.conference as 'East' | 'West',
      logoUrl: away.logo_url ?? undefined,
    },
    startsAt: new Date(data.starts_at),
    status: data.status as Game['status'],
    scoreHome: data.score_home ?? 0,
    scoreAway: data.score_away ?? 0,
    period: data.period ?? undefined,
    timeRemaining: data.time_remaining ?? undefined,
  };
}

function mapBoxScoreEntry(
  log: GameLogRow,
  player: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    team_id: string | null;
  },
): GameBoxScoreEntry {
  const baseEntry = {
    playerId: log.player_id,
    firstName: player.first_name,
    lastName: player.last_name,
    photoUrl: player.photo_url ?? undefined,
    teamId: player.team_id ?? '',
    minutes: log.minutes ?? 0,
    points: log.points ?? 0,
    rebounds: log.rebounds ?? 0,
    assists: log.assists ?? 0,
    steals: log.steals ?? 0,
    blocks: log.blocks ?? 0,
    turnovers: log.turnovers ?? 0,
    fgMade: log.fg_made ?? 0,
    fgAttempted: log.fg_attempted ?? 0,
    fg3Made: log.fg3_made ?? 0,
    fg3Attempted: log.fg3_attempted ?? 0,
    ftMade: log.ft_made ?? 0,
    ftAttempted: log.ft_attempted ?? 0,
    plusMinus: log.plus_minus ?? 0,
  };

  return {
    ...baseEntry,
    gameScore: calculateGameScore(baseEntry),
  };
}

export async function fetchGameDetail(gameId: string): Promise<GameDetail | null> {
  const game = await fetchGame(gameId);
  if (!game) return null;

  // Box score: stats de todos los jugadores en ese partido
  const { data: logs, error: logsError } = await supabase
    .from('player_game_log')
    .select('*')
    .eq('game_id', gameId);

  if (logsError) throw logsError;
  if (!logs || logs.length === 0) {
    return { game, homeRoster: [], awayRoster: [], mvp: null };
  }

  // Traemos datos de los jugadores en una sola query
  const playerIds = logs.map((l) => l.player_id);
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, first_name, last_name, photo_url, team_id')
    .in('id', playerIds);

  if (playersError) throw playersError;

  const playersMap = new Map((players ?? []).map((p) => [p.id, p]));

  // Combinamos logs con datos de jugadores
  const allEntries: GameBoxScoreEntry[] = [];
  for (const log of logs) {
    const player = playersMap.get(log.player_id);
    if (!player) continue;
    allEntries.push(mapBoxScoreEntry(log, player));
  }

  // Separamos por equipo
  const homeRoster = allEntries
    .filter((e) => e.teamId === game.homeTeam.id)
    .sort((a, b) => b.points - a.points);
  const awayRoster = allEntries
    .filter((e) => e.teamId === game.awayTeam.id)
    .sort((a, b) => b.points - a.points);

  // MVP: el de mayor Game Score entre los que jugaron
  const playedEntries = allEntries.filter((e) => e.minutes > 0);
  const mvp =
    playedEntries.length > 0
      ? playedEntries.reduce((best, e) => (e.gameScore > best.gameScore ? e : best))
      : null;

  return { game, homeRoster, awayRoster, mvp };
}
