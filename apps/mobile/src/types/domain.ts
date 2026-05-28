export type Team = {
  id: string;
  name: string;
  fullName: string;
  abbreviation: string;
  city: string;
  conference: 'East' | 'West';
  logoUrl?: string;
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  position?: string;
  jerseyNumber?: string;
  photoUrl?: string;
};

export type GameStatus = 'scheduled' | 'live' | 'final';

export type Game = {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  startsAt: Date;
  status: GameStatus;
  scoreHome: number;
  scoreAway: number;
  period?: number;
  timeRemaining?: string;
};

export type PlayerGameStats = {
  playerId: string;
  gameId: string;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
};

export type PlayerSeasonStats = {
  playerId: string;
  season: string;
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalPct: number;
  threePointPct: number;
  freeThrowPct: number;
};

export type PlayerGameLogEntry = {
  playerId: string;
  gameId: string;
  gameDate: Date;
  season: string;
  matchup: string;
  isHome: boolean;
  opponentAbbreviation?: string;
  winLoss?: 'W' | 'L';
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgMade: number;
  fgAttempted: number;
  fg3Made: number;
  fg3Attempted: number;
  ftMade: number;
  ftAttempted: number;
  plusMinus: number;
  game?: {
    homeTeamId: string;
    awayTeamId: string;
    homeTeamAbbr: string;
    awayTeamAbbr: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    scoreHome: number;
    scoreAway: number;
  };
};
