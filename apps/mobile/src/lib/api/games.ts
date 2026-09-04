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
/**
 * Los siguientes N días que tienen partidos programados (posteriores a una
 * fecha de referencia). Es el espejo de fetchRecentGameDays: sirve para que
 * fuera de temporada la pantalla siga diciendo cuándo se vuelve a jugar.
 */
export async function fetchUpcomingGameDays(
  after: Date,
  daysCount: number,
): Promise<{ date: Date; games: Game[] }[]> {
  const afterIso = new Date(after);
  afterIso.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('games')
    .select(SELECT_WITH_TEAMS)
    .gt('starts_at', afterIso.toISOString())
    .neq('status', 'final')
    .order('starts_at', { ascending: true })
    .limit(200);

  if (error) throw error;

  const mapped = (data ?? []).map(mapGame).filter((g): g is Game => g !== null);

  const byDay = new Map<string, Game[]>();
  for (const g of mapped) {
    const key = g.startsAt.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(g);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, daysCount)
    .map(([key, games]) => ({
      date: new Date(key + 'T00:00:00'),
      games,
    }));
}

/**
 * Devuelve un Map con el número de partidos por día en un rango de fechas.
 * La clave es la fecha en formato 'YYYY-MM-DD'.
 */
export async function fetchGameCountsByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<Map<string, number>> {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const { data, error } = await supabase
    .from('games')
    .select('starts_at')
    .gte('starts_at', startIso)
    .lte('starts_at', endIso);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const date = new Date(row.starts_at);
    // Clave: YYYY-MM-DD en hora local (no UTC)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export async function fetchGamesByTeams(
  teamIds: string[],
  daysBack: number,
  daysForward: number,
): Promise<Game[]> {
  if (teamIds.length === 0) return [];

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + daysForward);
  endDate.setHours(23, 59, 59, 999);

  const filters = teamIds
    .flatMap((id) => [`home_team_id.eq.${id}`, `away_team_id.eq.${id}`])
    .join(',');

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
    .or(filters)
    .gte('starts_at', startDate.toISOString())
    .lte('starts_at', endDate.toISOString())
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
