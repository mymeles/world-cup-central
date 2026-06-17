/**
 * Data provider seam.
 *
 * The app reads exclusively from the dedicated backend service (Fastify), which
 * serves normalized data from Postgres. The backend — not the app — talks to
 * sports providers, on a schedule. This keeps the app fast and the providers
 * shielded from user traffic.
 *
 * Reference data (team list, group letters) falls back to the bundled seed if the
 * backend is briefly unreachable, so the shell still renders; match data does not
 * fall back to invented fixtures.
 */

import type { Match, Scorer, StandingRow, Team } from '../types';
import { GROUPS, TEAMS, getTeam } from '../data/worldcup';
import { backendUrl } from './apiBase';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(backendUrl(path));
  const body = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (!res.ok || !body || !('data' in body)) {
    throw new Error(body?.error ?? `Backend request failed (${res.status}) for ${path}`);
  }
  return body.data as T;
}

async function safe<T>(request: Promise<T>, local: () => T | Promise<T>): Promise<T> {
  try {
    return await request;
  } catch {
    return local();
  }
}

export const dataProvider = {
  async getTeams(): Promise<Team[]> {
    return safe(get<Team[]>('/api/teams'), () => TEAMS);
  },

  async getTeam(id: string): Promise<Team | undefined> {
    return safe(
      get<Team[]>('/api/teams').then((teams) => teams.find((t) => t.id === id)),
      () => getTeam(id),
    );
  },

  async getMatches(): Promise<Match[]> {
    return safe(get<Match[]>('/api/matches'), () => []);
  },

  async getMatch(id: string): Promise<Match | undefined> {
    return safe(get<Match>(`/api/matches/${id}`).then((m) => m ?? undefined), () => undefined);
  },

  /** Full detail incl. lineups (with pitch coordinates), events and per-player stats. */
  async getMatchDetail(id: string): Promise<MatchDetail | undefined> {
    return safe(get<MatchDetail>(`/api/matches/${id}/detail`).then((m) => m ?? undefined), () => undefined);
  },

  async getMatchesForTeam(teamId: string): Promise<Match[]> {
    return safe(
      get<Match[]>('/api/matches').then((m) => m.filter((x) => x.homeId === teamId || x.awayId === teamId)),
      () => [],
    );
  },

  async getLiveMatches(): Promise<Match[]> {
    return safe(get<Match[]>('/api/matches').then((m) => m.filter((x) => x.status === 'live')), () => []);
  },

  async getGroups(): Promise<string[]> {
    return safe(get<string[]>('/api/groups'), () => GROUPS);
  },

  async getStandings(group: string): Promise<StandingRow[]> {
    return safe(get<StandingRow[]>(`/api/standings/${group}`), () => []);
  },

  async getTopScorers(): Promise<Scorer[]> {
    return safe(get<Scorer[]>('/api/scorers'), () => []);
  },
};

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

export type DataProvider = typeof dataProvider;
