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
  /** false en los jugadores históricos: no tienen partidos cargados. */
  isActive: boolean;
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
  seasonType?: 'preseason' | 'regular' | 'allstar' | 'playoffs' | 'playin';
  /** Balance de la eliminatoria tras este partido. Solo en playoffs. */
  seriesWins?: { home: number; away: number };
  /** 1 primera ronda, 2 semifinales de conferencia, 3 finales, 4 Finales NBA. */
  playoffRound?: number;
  /** Este partido decidio el titulo de la NBA. */
  titleDecider?: boolean;
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
  gameDate: Date | null;
  season?: string;
  matchup?: string;
  isHome?: boolean;
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

export type GameBoxScoreEntry = {
  playerId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  teamId: string;
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
  gameScore: number;
};

export type GameDetail = {
  game: Game;
  homeRoster: GameBoxScoreEntry[];
  awayRoster: GameBoxScoreEntry[];
  mvp: GameBoxScoreEntry | null;
};

export type LeagueStanding = {
  teamId: string;
  name: string;
  fullName: string;
  abbreviation: string;
  city: string;
  conference: 'East' | 'West';
  division?: string;
  logoUrl?: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winPercentage: number;
  pointDifferential: number;
  wonChampionship: boolean;
};

export type StandingsSeason = {
  season: string;
  gamesCount: number;
  /** Campeon de esa temporada. Falta en la temporada aun en juego. */
  champion?: {
    teamId: string;
    name: string;
    abbreviation: string;
    logoUrl?: string;
  };
};

/** Una etapa de la carrera: un jugador en un equipo durante una temporada. */
export type PlayerCareerEntry = {
  season: string;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamLogoUrl?: string;
  /** null cuando la temporada aun no ha empezado y solo hay plantilla. */
  gamesPlayed: number | null;
  minutes: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fieldGoalPct: number | null;
  threePointPct: number | null;
  freeThrowPct: number | null;
  /** Numero de equipos en los que jugo esa temporada. >1 significa traspaso. */
  teamCount: number;
  wonChampionship: boolean;
};

export type SearchResultPlayer = {
  type: 'player';
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  teamId?: string;
  teamName?: string;
  teamAbbreviation?: string;
  teamLogoUrl?: string;
  position?: string;
  photoUrl?: string;
  isActive: boolean;
};

export type SearchResultTeam = {
  type: 'team';
  id: string;
  name: string;
  fullName: string;
  abbreviation: string;
  city: string;
  conference: 'East' | 'West';
  logoUrl?: string;
};

export type SearchResult = SearchResultPlayer | SearchResultTeam;

/** Medias de toda la carrera, ponderadas por partidos jugados. */
export type PlayerCareerTotals = {
  playerId: string;
  seasons: number;
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalPct: number;
  threePointPct: number;
  freeThrowPct: number;
  championships: number;
  firstSeason: string;
  lastSeason: string;
};

/**
 * Una fila de plantilla, valga para la temporada actual o para una pasada.
 * Los nulos son reales: hay temporadas cargadas sin estadisticas.
 */
export type TeamSeasonPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  jerseyNumber?: string;
  position?: string;
  gamesPlayed: number | null;
  minutes: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  wonChampionship: boolean;
};

export type TeamSeason = {
  season: string;
  players: number;
  wonChampionship: boolean;
};

export type AwardCode =
  | 'champion'
  | 'mvp'
  | 'finals_mvp'
  | 'roy'
  | 'dpoy'
  | 'mip'
  | 'clutch'
  | 'sixth_man';

export type PlayerAward = {
  season: string;
  award: AwardCode;
  teamName?: string;
};

export type TeamTitle = {
  competition: 'nba' | 'nba_cup';
  season: string;
  /** Ano en que se levanto el titulo: la temporada 1969-70 es el 1970. */
  year: number;
};
