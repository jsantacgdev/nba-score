import { supabase } from '@/lib/supabase';
import type { StartingLineup, StartingLineupPlayer } from '@/types/domain';

/**
 * Quintetos iniciales de un partido, agrupados por equipo.
 *
 * Sale de la base y no de la CDN de la NBA: esa ruta exige la cabecera
 * 'Referer', que fetch prohibe fijar, asi que desde el movil siempre
 * responde 403.
 */
export async function fetchStartingLineups(gameId: string): Promise<StartingLineup[]> {
  const { data, error } = await supabase.rpc('game_starting_lineups', {
    target_game_id: gameId,
  });
  if (error) throw error;

  const porEquipo = new Map<string, StartingLineup>();

  for (const row of data ?? []) {
    if (!porEquipo.has(row.team_id)) {
      porEquipo.set(row.team_id, {
        teamId: row.team_id,
        teamAbbreviation: row.team_abbreviation ?? '?',
        teamLogoUrl: row.team_logo_url ?? undefined,
        players: [],
      });
    }

    const jugador: StartingLineupPlayer = {
      playerId: row.player_id,
      name: row.player_name,
      jerseyNumber: row.jersey_number ?? undefined,
      photoUrl: row.photo_url ?? undefined,
      courtPosition: row.court_position ?? undefined,
      minutes: row.minutes === null ? undefined : Number(row.minutes),
      points: row.points ?? undefined,
      rebounds: row.rebounds ?? undefined,
      assists: row.assists ?? undefined,
    };

    porEquipo.get(row.team_id)!.players.push(jugador);
  }

  return Array.from(porEquipo.values());
}
