export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Team {
  id: string;
  name: string;
  flag: string | null;
  group: string | null;
  confederation: string | null;
  rank: number | null;
  rating: number | null;
  host: boolean;
}

export interface Match {
  id: string;
  source: string;
  stage: string;
  group?: string | null;
  matchday?: number | null;
  homeId: string;
  awayId: string;
  homeName?: string | null;
  awayName?: string | null;
  homeFlag?: string | null;
  awayFlag?: string | null;
  kickoff: string;
  venue: string | null;
  city: string | null;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  minute?: number | null;
  featured: boolean;
  lastUpdated?: string | null;
}

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface LineupPlayer {
  playerId: string;
  name: string;
  number: number | null;
  position: string | null;
  gridX: number;
  gridY: number;
  isStarter: boolean;
  image?: string | null;
  goals?: number;
  assists?: number;
  rating?: number | null;
}

export interface Lineup {
  teamId: string;
  formation: string | null;
  players: LineupPlayer[];
}

export interface MatchEvent {
  id: string;
  minute: number | null;
  type: string | null;
  teamId: string | null;
  playerId: string | null;
  detail: string | null;
}

export interface MatchDetail extends Match {
  lineups: Lineup[];
  events: MatchEvent[];
}
