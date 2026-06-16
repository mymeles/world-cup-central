import type { Match } from '../types';

const MATCH_UPDATE_GRACE_MS = 2 * 60 * 60 * 1000;

export type MatchDisplayState =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'awaiting-live-update'
  | 'result-pending';

export function hasVerifiedScore(match: Match): boolean {
  return match.homeScore != null && match.awayScore != null;
}

export function isKickoffPast(match: Match, now = Date.now()): boolean {
  return now >= +new Date(match.kickoff);
}

export function getMatchDisplayState(match: Match, now = Date.now()): MatchDisplayState {
  if (match.status === 'finished' && hasVerifiedScore(match)) return 'finished';
  if (match.status === 'live') return 'live';

  const kickoffMs = +new Date(match.kickoff);
  if (now < kickoffMs) return 'scheduled';
  if (now < kickoffMs + MATCH_UPDATE_GRACE_MS) return 'awaiting-live-update';
  return 'result-pending';
}

export function isPastWithoutResult(match: Match, now = Date.now()): boolean {
  const state = getMatchDisplayState(match, now);
  return state === 'awaiting-live-update' || state === 'result-pending';
}
