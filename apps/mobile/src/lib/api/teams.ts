import { supabase } from '@/lib/supabase';
import type { Team } from '@/types/domain';
import type { Database } from '@/types/database';

type TeamRow = Database['public']['Tables']['teams']['Row'];

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    abbreviation: row.abbreviation,
    city: row.city,
    conference: row.conference as 'East' | 'West',
    logoUrl: row.logo_url ?? undefined,
  };
}

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('full_name');

  if (error) throw error;
  return data.map(mapTeam);
}

export async function fetchTeamById(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return mapTeam(data);
}
