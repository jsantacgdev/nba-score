import type { GameBoxScoreEntry } from '@/types/domain';

/**
 * Game Score de Hollinger:
 * PTS + 0.4*FGM - 0.7*FGA - 0.4*(FTA-FTM) + 0.7*ORB + 0.3*DRB
 * + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TOV
 *
 * Como no tenemos rebotes desglosados ni faltas, usamos una versión simplificada
 * que pondera todo lo que tenemos.
 */
export function calculateGameScore(entry: Omit<GameBoxScoreEntry, 'gameScore'>): number {
  const score =
    entry.points +
    0.4 * entry.fgMade -
    0.7 * entry.fgAttempted -
    0.4 * (entry.ftAttempted - entry.ftMade) +
    0.5 * entry.rebounds +
    entry.steals +
    0.7 * entry.assists +
    0.7 * entry.blocks -
    entry.turnovers;

  return Math.round(score * 10) / 10;
}
