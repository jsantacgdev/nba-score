import { supabase } from '@/lib/supabase';
import type { Game, HeadToHead, HeadToHeadGame, HeadToHeadSide } from '@/types/domain';

/**
 * Tope de enfrentamientos que se traen.
 *
 * La base arranca en 1984-85 y dos equipos de la misma division se han
 * visto poco mas de doscientas veces desde entonces, asi que con este
 * tope no se corta ningun historial y se evita paginar.
 */
const MAX_PARTIDOS = 400;

function puntos(game: HeadToHeadGame, teamId: string): { propios: number; rival: number } {
  const enCasa = game.homeTeamId === teamId;
  return {
    propios: enCasa ? game.scoreHome : game.scoreAway,
    rival: enCasa ? game.scoreAway : game.scoreHome,
  };
}

function resumirLado(teamId: string, games: HeadToHeadGame[]): HeadToHeadSide {
  const lado: HeadToHeadSide = { teamId, wins: 0, winsAtHome: 0, pointsAvg: 0 };
  let anotados = 0;

  for (const game of games) {
    const { propios, rival } = puntos(game, teamId);
    anotados += propios;

    if (game.winnerTeamId !== teamId) continue;

    lado.wins += 1;
    if (game.homeTeamId === teamId) lado.winsAtHome += 1;

    const margin = propios - rival;
    if (!lado.biggestWin || margin > lado.biggestWin.margin) {
      lado.biggestWin = { gameId: game.id, margin, startsAt: game.startsAt };
    }
  }

  lado.pointsAvg = games.length > 0 ? anotados / games.length : 0;
  return lado;
}

/** Cuantos seguidos lleva ganados el que gano el ultimo. */
function calcularRacha(games: HeadToHeadGame[]): HeadToHead['streak'] {
  const ultimo = games[0];
  if (!ultimo) return undefined;

  let wins = 0;
  for (const game of games) {
    if (game.winnerTeamId !== ultimo.winnerTeamId) break;
    wins += 1;
  }

  return { teamId: ultimo.winnerTeamId, wins };
}

export async function fetchHeadToHead(game: Game): Promise<HeadToHead> {
  const local = game.homeTeam.id;
  const visitante = game.awayTeam.id;

  const { data, error } = await supabase
    .from('games')
    .select(
      'id, starts_at, season, season_type, home_team_id, away_team_id, score_home, score_away',
    )
    // El emparejamiento es el mismo se juegue donde se juegue, asi que hay
    // que mirar las dos combinaciones de local y visitante.
    .or(
      `and(home_team_id.eq.${local},away_team_id.eq.${visitante}),` +
        `and(home_team_id.eq.${visitante},away_team_id.eq.${local})`,
    )
    .eq('status', 'final')
    // La pretemporada no cuenta como precedente: son amistosos y muchos
    // titulares ni se visten.
    .neq('season_type', 'preseason')
    // Solo lo anterior a este partido. El cara a cara es lo que los dos
    // equipos se traian hasta ese dia, no el resto de la historia: mirando
    // un partido de 2019 lo que paso despues no viene a cuento.
    .lt('starts_at', game.startsAt.toISOString())
    .neq('id', game.id)
    .order('starts_at', { ascending: false })
    .limit(MAX_PARTIDOS);

  if (error) throw error;

  const games: HeadToHeadGame[] = (data ?? [])
    .map((row) => {
      const scoreHome = row.score_home ?? 0;
      const scoreAway = row.score_away ?? 0;

      return {
        id: row.id,
        startsAt: new Date(row.starts_at),
        season: row.season,
        seasonType: row.season_type,
        homeTeamId: row.home_team_id,
        awayTeamId: row.away_team_id,
        scoreHome,
        scoreAway,
        winnerTeamId: scoreHome > scoreAway ? row.home_team_id : row.away_team_id,
      };
    })
    // En la NBA no hay empates: un final igualado es una fila a medio
    // cargar y contarla daria una victoria a quien no la gano.
    .filter((g) => g.scoreHome !== g.scoreAway);

  return {
    games,
    home: resumirLado(local, games),
    away: resumirLado(visitante, games),
    firstSeason: games[games.length - 1]?.season,
    streak: calcularRacha(games),
  };
}
