import { supabase } from '@/lib/supabase';
import type {
  DealEntry,
  PlayerInjury,
  PlayerMovement,
  TeamMovement,
} from '@/types/domain';

export async function fetchPlayerMovements(playerId: string): Promise<PlayerMovement[]> {
  const { data, error } = await supabase.rpc('player_movements', {
    target_player_id: playerId,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    dealId: row.deal_id ?? undefined,
    type: row.transaction_type,
    date: new Date(row.transaction_date),
    description: row.description,
    fromTeam: row.from_team_id
      ? {
          id: row.from_team_id,
          abbreviation: row.from_abbreviation ?? '?',
          logoUrl: row.from_logo_url ?? undefined,
        }
      : undefined,
    toTeam: row.to_team_id
      ? {
          id: row.to_team_id,
          abbreviation: row.to_abbreviation ?? '?',
          logoUrl: row.to_logo_url ?? undefined,
        }
      : undefined,
  }));
}

export async function fetchTeamMovements(teamId: string): Promise<TeamMovement[]> {
  const { data, error } = await supabase.rpc('team_movements', {
    target_team_id: teamId,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    dealId: row.deal_id ?? undefined,
    type: row.transaction_type,
    date: new Date(row.transaction_date),
    description: row.description,
    direction: row.direction === 'in' ? 'in' : 'out',
    playerId: row.player_id ?? undefined,
    playerName: row.player_name || undefined,
    photoUrl: row.photo_url ?? undefined,
    otherTeam: row.other_team_id
      ? {
          id: row.other_team_id,
          abbreviation: row.other_abbreviation ?? '?',
          logoUrl: row.other_logo_url ?? undefined,
        }
      : undefined,
  }));
}

export async function fetchDealDetail(dealId: string): Promise<DealEntry[]> {
  const { data, error } = await supabase.rpc('deal_detail', {
    target_deal_id: dealId,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    date: new Date(row.transaction_date),
    description: row.description,
    playerId: row.player_id ?? undefined,
    playerName: row.player_name || undefined,
    photoUrl: row.photo_url ?? undefined,
    isDraftPick: row.is_draft_pick ?? false,
    fromTeam: row.from_team_id
      ? {
          id: row.from_team_id,
          abbreviation: row.from_abbreviation ?? '?',
          name: row.from_name ?? '',
          logoUrl: row.from_logo_url ?? undefined,
        }
      : undefined,
    toTeam: row.to_team_id
      ? {
          id: row.to_team_id,
          abbreviation: row.to_abbreviation ?? '?',
          name: row.to_name ?? '',
          logoUrl: row.to_logo_url ?? undefined,
        }
      : undefined,
  }));
}

export async function fetchPlayerInjuries(playerId: string): Promise<PlayerInjury[]> {
  const { data, error } = await supabase.rpc('player_injury_history', {
    target_player_id: playerId,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status ?? undefined,
    injuryType: row.injury_type ?? undefined,
    side: row.side ?? undefined,
    returnDate: row.return_date ? new Date(row.return_date) : undefined,
    shortComment: row.short_comment ?? undefined,
    longComment: row.long_comment ?? undefined,
    reportedAt: row.reported_at ? new Date(row.reported_at) : undefined,
    firstSeenAt: row.first_seen_at ? new Date(row.first_seen_at) : undefined,
    isCurrent: row.is_current ?? false,
    teamId: row.team_id ?? undefined,
    teamAbbreviation: row.team_abbreviation ?? undefined,
    teamLogoUrl: row.team_logo_url ?? undefined,
  }));
}
