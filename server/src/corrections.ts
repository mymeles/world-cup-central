import type { Match, MatchEvent } from './types.js';

const IRAN_NEW_ZEALAND_MATCH_ID = 'wc-G-IRN-NZL';
const VERIFIED_AT = '2026-06-16T03:35:00.000Z';

export const matchCorrections: Record<string, Partial<Match>> = {
  [IRAN_NEW_ZEALAND_MATCH_ID]: {
    source: 'openfootball',
    status: 'finished',
    homeScore: 2,
    awayScore: 2,
    minute: null,
    lastUpdated: VERIFIED_AT,
  },
};

export const scorerCorrections = [
  { matchId: IRAN_NEW_ZEALAND_MATCH_ID, playerId: 'of-ramin-rezaeian', name: 'Ramin Rezaeian', teamId: 'IRN', goals: 1, assists: 0 },
  { matchId: IRAN_NEW_ZEALAND_MATCH_ID, playerId: 'of-mohammad-mohebbi', name: 'Mohammad Mohebbi', teamId: 'IRN', goals: 1, assists: 0 },
  { matchId: IRAN_NEW_ZEALAND_MATCH_ID, playerId: 'of-elijah-just', name: 'Elijah Just', teamId: 'NZL', goals: 2, assists: 0 },
];

export const eventCorrections: Record<string, MatchEvent[]> = {
  [IRAN_NEW_ZEALAND_MATCH_ID]: [
    { id: `${IRAN_NEW_ZEALAND_MATCH_ID}:7:nzl:elijah-just`, minute: 7, type: 'goal', teamId: 'NZL', playerId: 'of-elijah-just', detail: 'Elijah Just' },
    { id: `${IRAN_NEW_ZEALAND_MATCH_ID}:32:irn:ramin-rezaeian`, minute: 32, type: 'goal', teamId: 'IRN', playerId: 'of-ramin-rezaeian', detail: 'Ramin Rezaeian' },
    { id: `${IRAN_NEW_ZEALAND_MATCH_ID}:54:nzl:elijah-just`, minute: 54, type: 'goal', teamId: 'NZL', playerId: 'of-elijah-just', detail: 'Elijah Just' },
    { id: `${IRAN_NEW_ZEALAND_MATCH_ID}:64:irn:mohammad-mohebbi`, minute: 64, type: 'goal', teamId: 'IRN', playerId: 'of-mohammad-mohebbi', detail: 'Mohammad Mohebbi' },
  ],
};

export function applyMatchCorrections<T extends Match>(match: T): T {
  const correction = matchCorrections[match.id];
  return correction ? ({ ...match, ...correction } as T) : match;
}

