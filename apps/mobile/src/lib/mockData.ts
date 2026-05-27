import type { Game, Team } from '@/types/domain';

const lakers: Team = {
  id: '1610612747',
  name: 'Lakers',
  fullName: 'Los Angeles Lakers',
  abbreviation: 'LAL',
  city: 'Los Angeles',
  conference: 'West',
};

const celtics: Team = {
  id: '1610612738',
  name: 'Celtics',
  fullName: 'Boston Celtics',
  abbreviation: 'BOS',
  city: 'Boston',
  conference: 'East',
};

const warriors: Team = {
  id: '1610612744',
  name: 'Warriors',
  fullName: 'Golden State Warriors',
  abbreviation: 'GSW',
  city: 'Golden State',
  conference: 'West',
};

const nuggets: Team = {
  id: '1610612743',
  name: 'Nuggets',
  fullName: 'Denver Nuggets',
  abbreviation: 'DEN',
  city: 'Denver',
  conference: 'West',
};

const heat: Team = {
  id: '1610612748',
  name: 'Heat',
  fullName: 'Miami Heat',
  abbreviation: 'MIA',
  city: 'Miami',
  conference: 'East',
};

const knicks: Team = {
  id: '1610612752',
  name: 'Knicks',
  fullName: 'New York Knicks',
  abbreviation: 'NYK',
  city: 'New York',
  conference: 'East',
};

export const mockTeams: Team[] = [
  lakers, celtics, warriors, nuggets, heat, knicks,
];

export const mockGames: Game[] = [
  {
    id: 'g1',
    homeTeam: lakers,
    awayTeam: celtics,
    startsAt: new Date(),
    status: 'live',
    scoreHome: 87,
    scoreAway: 92,
    period: 3,
    timeRemaining: '4:23',
  },
  {
    id: 'g2',
    homeTeam: warriors,
    awayTeam: nuggets,
    startsAt: new Date(),
    status: 'live',
    scoreHome: 65,
    scoreAway: 71,
    period: 3,
    timeRemaining: '1:12',
  },
  {
    id: 'g3',
    homeTeam: heat,
    awayTeam: knicks,
    startsAt: new Date(),
    status: 'final',
    scoreHome: 108,
    scoreAway: 102,
  },
  {
    id: 'g4',
    homeTeam: celtics,
    awayTeam: warriors,
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 3),
    status: 'scheduled',
    scoreHome: 0,
    scoreAway: 0,
  },
];