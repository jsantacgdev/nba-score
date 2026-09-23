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
  isActive: boolean;
  /** Tal y como la publica la NBA: "6-8", pies y pulgadas. */
  height?: string;
  heightCm?: number;
  weightKg?: number;
  birthDate?: Date;
  /** Temporadas en la liga; 0 si es novato. */
  experience?: number;
  college?: string;
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
  seriesWins?: { home: number; away: number };
  playoffRound?: number;
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
  seasonType?: string;
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

export type GameLineupPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  teamId: string;
  position?: string;
  jerseyNumber?: string;
};

export type GameDetail = {
  game: Game;
  homeRoster: GameBoxScoreEntry[];
  awayRoster: GameBoxScoreEntry[];
  mvp: GameBoxScoreEntry | null;
  homeLineup: GameLineupPlayer[];
  awayLineup: GameLineupPlayer[];
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
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  streak: number;
  last10Wins: number;
  last10Losses: number;
  lastResults: ('W' | 'L')[];
};

export type StandingsSeason = {
  season: string;
  gamesCount: number;
  champion?: {
    teamId: string;
    name: string;
    abbreviation: string;
    logoUrl?: string;
  };
};

export type PlayerCareerEntry = {
  season: string;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  teamLogoUrl?: string;
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
  year: number;
};

export type DraftPick = {
  playerId: string;
  playerName: string;
  draftYear: number;
  round: number | null;
  roundPick: number | null;
  overallPick: number | null;
  teamId?: string;
  teamAbbreviation?: string;
  teamLogoUrl?: string;
  organization?: string;
  photoUrl?: string;
  roySeason?: string;
  hasProfile: boolean;
};

export type DraftYear = {
  year: number;
  picks: number;
  rounds: number;
  roy: {
    playerId: string;
    playerName: string;
    photoUrl?: string;
    season: string;
  }[];
};

export type LeaderStat = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'minutes';

export type LeaderEntry = {
  rank: number;
  playerId: string;
  playerName: string;
  photoUrl?: string;
  teamId?: string;
  teamAbbreviation?: string;
  teamLogoUrl?: string;
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
};

export type TeamRef = {
  id: string;
  abbreviation: string;
  name?: string;
  logoUrl?: string;
};

export type MovementType =
  | 'Trade'
  | 'Signing'
  | 'Waive'
  | 'AwardOnWaivers'
  | 'ContractConverted'
  | string;

export type PlayerMovement = {
  id: string;
  dealId?: string;
  type: MovementType;
  date: Date;
  description: string;
  fromTeam?: TeamRef;
  toTeam?: TeamRef;
};

export type TeamMovement = {
  id: string;
  dealId?: string;
  type: MovementType;
  date: Date;
  description: string;
  direction: 'in' | 'out';
  playerId?: string;
  playerName?: string;
  photoUrl?: string;
  otherTeam?: TeamRef;
};

export type DealEntry = {
  id: string;
  date: Date;
  description: string;
  playerId?: string;
  playerName?: string;
  photoUrl?: string;
  isDraftPick: boolean;
  /**
   * Ronda y año de la eleccion, cuando se han podido confirmar. El feed de
   * la NBA solo dice "draft consideration"; esto sale de
   * Basketball-Reference y queda a nulo si el cruce no fue seguro.
   */
  draftRound?: number;
  draftPickYear?: number;
  draftNote?: string;
  fromTeam?: TeamRef;
  toTeam?: TeamRef;
};

export type PlayerInjury = {
  id: string;
  status?: string;
  injuryType?: string;
  side?: string;
  returnDate?: Date;
  shortComment?: string;
  longComment?: string;
  reportedAt?: Date;
  firstSeenAt?: Date;
  isCurrent: boolean;
  teamId?: string;
  teamAbbreviation?: string;
  teamLogoUrl?: string;
};

export type LiveScoreboardGame = {
  gameId: string;
  status: 'scheduled' | 'live' | 'final';
  statusText: string;
  period: number;
  clock?: string;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
};

export type LivePlayer = {
  playerId: string;
  name: string;
  jerseyNumber?: string;
  starter: boolean;
  onCourt: boolean;
  played: boolean;
  minutes: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  plusMinus: number;
};

export type LiveTeam = {
  abbreviation: string;
  score: number;
  periods: number[];
  players: LivePlayer[];
};

export type LiveGame = {
  gameId: string;
  status: 'scheduled' | 'live' | 'final';
  statusText: string;
  period: number;
  clock?: string;
  arena?: string;
  attendance?: number;
  home: LiveTeam;
  away: LiveTeam;
};

export type StartingLineupPlayer = {
  playerId: string;
  name: string;
  jerseyNumber?: string;
  photoUrl?: string;
  courtPosition?: string;
  minutes?: number;
  points?: number;
  rebounds?: number;
  assists?: number;
};

export type StartingLineup = {
  teamId: string;
  teamAbbreviation: string;
  teamLogoUrl?: string;
  players: StartingLineupPlayer[];
};

export type CareerHigh = {
  stat: 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks';
  value: number;
  gameId?: string;
  date?: Date;
  season?: string;
  opponentAbbreviation?: string;
  seasonType?: string;
};

export type TeamSalaryPlayer = {
  playerId: string;
  playerName: string;
  photoUrl?: string;
  jerseyNumber?: string;
  position?: string;
  salary: number;
};

/**
 * Nomina de un equipo y los umbrales de esa temporada.
 *
 * Los aprons solo existen desde el convenio de 2023; en temporadas
 * anteriores llegan a cero y no deben pintarse.
 */
export type TeamSalary = {
  season: string;
  payroll: number;
  salaryCap: number;
  salaryFloor: number;
  luxuryTax: number;
  firstApron: number;
  secondApron: number;
  players: TeamSalaryPlayer[];
};

/** Una temporada del contrato de un jugador. */
export type PlayerContractYear = {
  season: string;
  salary: number;
  teamId?: string;
  teamAbbreviation?: string;
  teamName?: string;
  teamLogoUrl?: string;
};

export type PlayerSalarySeason = {
  season: string;
  salary: number;
  teamId?: string;
  teamName: string;
  teamAbbreviation?: string;
  teamLogoUrl?: string;
  /** Temporada aun no jugada: es contrato, no dinero cobrado. */
  future: boolean;
};

/** Un tramo seguido en el mismo equipo. */
export type SalaryStint = {
  teamName: string;
  teamId?: string;
  teamAbbreviation?: string;
  teamLogoUrl?: string;
  startSeason: string;
  endSeason: string;
  total: number;
  seasons: PlayerSalarySeason[];
};

// ============================================
// Novedades
// ============================================

/** Las tres cosas que pasan entre partido y partido. */
export type FeedKind = 'news' | 'injury' | 'movement';

/**
 * Una fila del hilo de novedades.
 *
 * Las tres fuentes llegan por la misma funcion y con la misma forma, asi
 * que los campos que solo usa una van opcionales: el enlace y la imagen
 * son de las noticias, el rival es del movimiento, el estado de la lesion
 * viaja en `subtitle`.
 */
export type FeedEntry = {
  kind: FeedKind;
  id: string;
  happenedAt: Date;
  title: string;
  subtitle?: string;
  detail?: string;
  /** Solo noticias: el articulo en espn.es. */
  link?: string;
  imageUrl?: string;
  playerId?: string;
  playerName?: string;
  photoUrl?: string;
  team?: TeamRef;
  /** Solo movimientos: el equipo de origen. */
  otherTeam?: TeamRef;
  dealId?: string;
  /** Solo lesiones: zona y lado, para escribirlas en castellano. */
  injuryType?: string;
  injurySide?: string;
};

export type HeadToHeadGame = {
  id: string;
  startsAt: Date;
  season: string;
  seasonType: string;
  homeTeamId: string;
  awayTeamId: string;
  scoreHome: number;
  scoreAway: number;
  winnerTeamId: string;
};

export type HeadToHeadSide = {
  teamId: string;
  wins: number;
  winsAtHome: number;
  pointsAvg: number;
  biggestWin?: { gameId: string; margin: number; startsAt: Date };
};

export type HeadToHead = {
  games: HeadToHeadGame[];
  home: HeadToHeadSide;
  away: HeadToHeadSide;
  firstSeason?: string;
  streak?: { teamId: string; wins: number };
};

export type TeamForm = {
  teamId: string;
  wins: number;
  losses: number;
  conferenceRank?: number;
  pointsFor: number;
  pointsAgainst: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  streak: number;
  lastResults: ('W' | 'L')[];
};

export type GameTeamForm = {
  season: string;
  previousSeason: boolean;
  home: TeamForm;
  away: TeamForm;
};

export type WinProbability = {
  homeTeamId: string;
  awayTeamId: string;
  probHome: number;
  probHomeNoInjuries: number;
  ratingHome: number;
  ratingAway: number;
  homeAdvantage: number;
  restEffect: number;
  restDaysHome: number;
  restDaysAway: number;
  injuriesHome: number;
  injuriesAway: number;
  injuryAdjustment: number;
  expectedMargin: number;
  gamesHome: number;
  gamesAway: number;
  season: string;
};
