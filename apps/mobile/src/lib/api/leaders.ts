import { supabase } from '@/lib/supabase';

/**
 * Ultima temporada con medias cargadas.
 *
 * No vale la temporada en curso del selector: 2026-27 aun no ha empezado
 * y la pantalla abriria vacia.
 */
export async function fetchLatestStatsSeason(): Promise<string | null> {
  const { data, error } = await supabase
    .from('player_season_history')
    .select('season')
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.season ?? null;
}
import type { LeaderEntry, LeaderStat } from '@/types/domain';

export async function fetchSeasonLeaders(
  season: string,
  stat: LeaderStat,
  limit = 100,
): Promise<LeaderEntry[]> {
  const { data, error } = await supabase.rpc('season_leaders', {
    target_season: season,
    target_stat: stat,
    target_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    rank: row.puesto,
    playerId: row.player_id,
    playerName: row.player_name,
    photoUrl: row.photo_url ?? undefined,
    teamId: row.team_id ?? undefined,
    teamAbbreviation: row.team_abbreviation ?? undefined,
    teamLogoUrl: row.team_logo_url ?? undefined,
    gamesPlayed: row.games_played,
    minutes: Number(row.minutes ?? 0),
    points: Number(row.points ?? 0),
    rebounds: Number(row.rebounds ?? 0),
    assists: Number(row.assists ?? 0),
    steals: Number(row.steals ?? 0),
    blocks: Number(row.blocks ?? 0),
  }));
}
