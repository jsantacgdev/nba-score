import { supabase } from '@/lib/supabase';
import type { FeedEntry, FeedKind } from '@/types/domain';

/**
 * El hilo de novedades: titulares de ESPN Deportes, lesiones vigentes y
 * movimientos, ordenados por fecha.
 *
 * El filtro va al servidor y no aqui porque las tres fuentes llevan ritmos
 * muy distintos: las lesiones se reportan a dias vista y los titulares
 * salen cada hora, asi que filtrar en la app obligaria a traerse el hilo
 * entero para enseñar cuatro filas.
 */
export async function fetchNovedades(limit = 60, kind?: FeedKind): Promise<FeedEntry[]> {
  const { data, error } = await supabase.rpc('novedades', {
    target_limit: limit,
    kind_filter: kind,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    kind: row.kind as FeedKind,
    id: row.id,
    happenedAt: new Date(row.happened_at),
    title: row.title ?? '',
    subtitle: row.subtitle ?? undefined,
    detail: row.detail ?? undefined,
    link: row.link ?? undefined,
    imageUrl: row.image_url ?? undefined,
    playerId: row.player_id ?? undefined,
    playerName: row.player_name || undefined,
    photoUrl: row.photo_url ?? undefined,
    team: row.team_id
      ? {
          id: row.team_id,
          abbreviation: row.team_abbreviation ?? '?',
          logoUrl: row.team_logo_url ?? undefined,
        }
      : undefined,
    otherTeam: row.other_team_id
      ? {
          id: row.other_team_id,
          abbreviation: row.other_abbreviation ?? '?',
          logoUrl: row.other_logo_url ?? undefined,
        }
      : undefined,
    dealId: row.deal_id ?? undefined,
    injuryType: row.injury_type ?? undefined,
    injurySide: row.injury_side ?? undefined,
  }));
}
