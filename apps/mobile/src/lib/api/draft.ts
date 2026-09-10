import { supabase } from '@/lib/supabase';
import type { DraftPick, DraftYear } from '@/types/domain';

export async function fetchDraftYears(): Promise<DraftYear[]> {
  const { data, error } = await supabase.rpc('draft_years');

  if (error) throw error;

  return (data ?? []).map((row) => {
    const roy: DraftYear['roy'] = [];
    if (row.roy_player_id) {
      roy.push({
        playerId: row.roy_player_id,
        playerName: row.roy_player_name ?? '',
        photoUrl: row.roy_photo_url ?? undefined,
        season: row.roy_season ?? '',
      });
    }
    if (row.roy2_player_id) {
      roy.push({
        playerId: row.roy2_player_id,
        playerName: row.roy2_player_name ?? '',
        photoUrl: row.roy2_photo_url ?? undefined,
        season: row.roy2_season ?? '',
      });
    }

    return {
      year: row.draft_year ?? 0,
      picks: row.picks ?? 0,
      rounds: row.rounds ?? 0,
      roy,
    };
  });
}

export async function fetchDraftClass(year: number): Promise<DraftPick[]> {
  const { data, error } = await supabase.rpc('draft_class', { target_year: year });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    playerId: row.player_id ?? '',
    playerName: row.player_name ?? '',
    draftYear: year,
    round: row.round ?? null,
    roundPick: row.round_pick ?? null,
    overallPick: row.overall_pick ?? null,
    teamId: row.team_id ?? undefined,
    teamAbbreviation: row.team_abbreviation ?? undefined,
    teamLogoUrl: row.team_logo_url ?? undefined,
    organization: row.organization ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    roySeason: row.roy_season ?? undefined,
    hasProfile: row.has_profile ?? false,
  }));
}

export async function fetchPlayerDraft(playerId: string): Promise<DraftPick | null> {
  const { data, error } = await supabase
    .from('draft_picks')
    .select('*')
    .eq('player_id', playerId)
    .order('draft_year', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    playerId: data.player_id,
    playerName: data.player_name,
    draftYear: data.draft_year,
    round: data.round ?? null,
    roundPick: data.round_pick ?? null,
    overallPick: data.overall_pick ?? null,
    teamId: data.team_id ?? undefined,
    teamAbbreviation: data.team_abbreviation ?? undefined,
    organization: data.organization ?? undefined,
    hasProfile: true,
  };
}
