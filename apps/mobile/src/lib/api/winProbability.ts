import { supabase } from '@/lib/supabase';
import type { WinProbability } from '@/types/domain';

export async function fetchWinProbability(gameId: string): Promise<WinProbability | null> {
  const { data, error } = await supabase.rpc('game_win_probability', {
    target_game_id: gameId,
  });

  if (error) throw error;

  const fila = (data ?? [])[0];
  if (!fila) return null;

  return {
    homeTeamId: fila.home_team_id,
    awayTeamId: fila.away_team_id,
    probHome: Number(fila.prob_home),
    probHomeNoInjuries: Number(fila.prob_home_sin_bajas),
    ratingHome: Number(fila.rating_home),
    ratingAway: Number(fila.rating_away),
    homeAdvantage: Number(fila.ventaja_campo),
    restEffect: Number(fila.efecto_descanso),
    restDaysHome: fila.dias_home,
    restDaysAway: fila.dias_away,
    injuriesHome: fila.bajas_home,
    injuriesAway: fila.bajas_away,
    injuryAdjustment: Number(fila.ajuste_bajas),
    expectedMargin: Number(fila.margen_esperado),
    gamesHome: fila.partidos_home,
    gamesAway: fila.partidos_away,
    season: fila.temporada,
    seasonType: fila.tipo,
  };
}
