import { useQuery } from '@tanstack/react-query';
import { fetchPlayersByTeam } from '@/lib/api/players';
import { fetchTeamById, fetchTeamSeasonRoster, fetchTeamSeasons } from '@/lib/api/teams';
import { fetchSeasonStatsByTeam } from '@/lib/api/players';

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeamById(teamId),
    enabled: !!teamId,
  });
}

export function useTeamRoster(teamId: string) {
  return useQuery({
    queryKey: ['roster', teamId],
    queryFn: () => fetchPlayersByTeam(teamId),
    enabled: !!teamId,
  });
}

export function useTeamSeasonStats(teamId: string) {
  return useQuery({
    queryKey: ['seasonStats', teamId],
    queryFn: () => fetchSeasonStatsByTeam(teamId),
    enabled: !!teamId,
  });
}

/** Plantilla historica. Solo se consulta si hay temporada seleccionada. */
export function useTeamSeasonRoster(teamId: string, season?: string) {
  return useQuery({
    queryKey: ['teamSeasonRoster', teamId, season],
    queryFn: () => fetchTeamSeasonRoster(teamId, season!),
    enabled: !!teamId && !!season,
    staleTime: 1000 * 60 * 60,
  });
}

/** Temporadas seleccionables de un equipo. Cambian poco: una hora de cache. */
export function useTeamSeasons(teamId: string) {
  return useQuery({
    queryKey: ['teamSeasons', teamId],
    queryFn: () => fetchTeamSeasons(teamId),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 60,
  });
}
