/** Domain model for the tournament. Kept framework-agnostic so the same types
 * back the schedule fallback and live provider data. */

export type Confederation =
  | 'UEFA'
  | 'CONMEBOL'
  | 'CONCACAF'
  | 'CAF'
  | 'AFC'
  | 'OFC';

export interface Team {
  id: string; // 3-letter code, e.g. 'ARG'
  name: string;
  flag: string; // emoji flag
  group: string; // 'A' .. 'L'
  rank: number; // FIFA world ranking
  confederation: Confederation;
  /** Internal Elo-style power rating that drives the prediction model. */
  rating: number;
  host?: boolean;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type Stage =
  | 'Group'
  | 'Round of 32'
  | 'Round of 16'
  | 'Quarter-final'
  | 'Semi-final'
  | 'Third place'
  | 'Final';

export interface Match {
  id: string;
  stage: Stage;
  group?: string;
  matchday?: number;
  homeId: string;
  awayId: string;
  homeName?: string;
  awayName?: string;
  homeFlag?: string;
  awayFlag?: string;
  kickoff: string; // ISO 8601
  venue: string;
  city: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: number; // populated while live
  featured?: boolean; // marquee match highlighted on the home page
  source?: string; // live data provider that supplied the fixture
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
}

export interface Scorer {
  playerId: string;
  name: string;
  teamId: string;
  goals: number;
  assists: number;
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

/** Output of the prediction engine for a single fixture. */
export interface MatchPrediction {
  homeWin: number; // 0..1
  draw: number;
  awayWin: number;
  expHomeGoals: number;
  expAwayGoals: number;
  likelyScore: { home: number; away: number };
  confidence: number; // 0..1, how decisive the favourite is
}
