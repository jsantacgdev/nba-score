import { supabase } from '@/lib/supabase';
import type { Game } from '@/types/domain';
import type { Database } from '@/types/database';

type GameRow = Database['public']['Tables']['games']['Row'];
type TeamRow = Database['public']['Tables']['teams']['Row'];

type GameWithTeams = GameRow & {
  home_team: TeamRow | TeamRow[] | null;
  away_team: TeamRow | TeamRow[] | null;
};

function pickTeam(t: TeamRow | TeamRow[] | null): TeamRow | null {
  if (!t) return null;
  return Array.isArray(t) ? (t[0] ?? null) : t;
}

function mapGame(row: GameWithTeams): Game | null {
  const home = pickTeam(row.home_team);
  const away = pickTeam(row.away_team);
  if (!home || !away) return null;

  const game: Game = {
    id: row.id,
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
    startsAt: new Date(row.starts_at),
    status: row.status as Game['status'],
    scoreHome: row.score_home ?? 0,
    scoreAway: row.score_away ?? 0,
    period: row.period ?? undefined,
    timeRemaining: row.time_remaining ?? undefined,
  };

  return game;
}

const SELECT_WITH_TEAMS = `
  *,
  home_team:teams!home_team_id(*),
  away_team:teams!away_team_id(*)
`;

export async function fetchGamesByDate(date: Date): Promise<Game[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('games')
    .select(SELECT_WITH_TEAMS)
    .gte('starts_at', startOfDay.toISOString())
    .lte('starts_at', endOfDay.toISOString())
    .order('starts_at');

  if (error) throw error;
  return (data ?? []).map(mapGame).filter((g): g is Game => g !== null);
}

export async function fetchMostRecentGameDate(): Promise<Date | null> {
  const { data, error } = await supabase
    .from('games')
    .select('starts_at')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? new Date(data.starts_at) : null;
}

/**
 * Trae los últimos N días con partidos jugados (anteriores a una fecha de referencia).
 * Devuelve un mapa de fecha (YYYY-MM-DD) a lista de partidos.
 */
export async function fetchRecentGameDays(
  before: Date,
  daysCount: number,
): Promise<{ date: Date; games: Game[] }[]> {
  const beforeIso = new Date(before);
  beforeIso.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('games')
    .select(SELECT_WITH_TEAMS)
    .lt('starts_at', beforeIso.toISOString())
    .eq('status', 'final')
    .order('starts_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const mapped = (data ?? []).map(mapGame).filter((g): g is Game => g !== null);

  const byDay = new Map<string, Game[]>();
  for (const g of mapped) {
    const key = g.startsAt.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(g);
  }

  const days = Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, daysCount)
    .map(([key, games]) => ({
      date: new Date(key + 'T00:00:00'),
      games,
    }));

  return days;
}
