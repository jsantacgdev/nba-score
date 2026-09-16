import { supabase } from '@/lib/supabase';
import type { GameTeamForm, TeamForm } from '@/types/domain';

type Fila = {
  team_id: string;
  side: string;
  season: string;
  previous_season: boolean;
  wins: number;
  losses: number;
  conference_rank: number | null;
  points_for: number | string;
  points_against: number | string;
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
  streak: number;
  last_results: string[] | null;
};

function mapear(fila: Fila): TeamForm {
  return {
    teamId: fila.team_id,
    wins: fila.wins,
    losses: fila.losses,
    conferenceRank: fila.conference_rank ?? undefined,
    pointsFor: Number(fila.points_for),
    pointsAgainst: Number(fila.points_against),
    homeWins: fila.home_wins,
    homeLosses: fila.home_losses,
    awayWins: fila.away_wins,
    awayLosses: fila.away_losses,
    streak: fila.streak,
    lastResults: (fila.last_results ?? []).filter(
      (r): r is 'W' | 'L' => r === 'W' || r === 'L',
    ),
  };
}

/**
 * Como llegan los dos equipos, a fecha del partido.
 *
 * El calculo entero esta en la funcion game_team_form: el puesto en la
 * conferencia sale del balance de los quince equipos de ese lado, y eso
 * no se puede traer al movil.
 */
export async function fetchGameTeamForm(gameId: string): Promise<GameTeamForm | null> {
  const { data, error } = await supabase.rpc('game_team_form', { target_game_id: gameId });

  if (error) throw error;

  const filas = (data ?? []) as Fila[];
  const local = filas.find((f) => f.side === 'home');
  const visitante = filas.find((f) => f.side === 'away');
  if (!local || !visitante) return null;

  const home = mapear(local);
  const away = mapear(visitante);

  // Un partido de la primera temporada que consta no tiene nada detras:
  // mejor no enseñar la seccion que enseñarla a ceros.
  const sinNada =
    home.lastResults.length === 0 &&
    away.lastResults.length === 0 &&
    home.wins + home.losses + away.wins + away.losses === 0;
  if (sinNada) return null;

  return {
    season: local.season,
    previousSeason: local.previous_season,
    home,
    away,
  };
}
