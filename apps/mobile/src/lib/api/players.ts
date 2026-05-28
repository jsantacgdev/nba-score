import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/domain';
import type { Database } from '@/types/database';

type PlayerRow = Database['public']['Tables']['players']['Row'];

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
