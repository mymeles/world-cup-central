import type { Match, Team } from '../types';
import { TEAMS } from '../data/worldcup';

export type MatchSide = 'home' | 'away';

export type MatchTeamDisplay = {
  id: string;
  name: string;
  flag: string;
  knownTeam?: Team;
};

function normalizeTeam(team: Team): Team {
  return {
    ...team,
    flag: team.flag ?? team.id,
    group: team.group ?? '',
    rank: team.rank ?? 0,
    confederation: team.confederation ?? 'UEFA',
    rating: team.rating ?? 1700,
  } as Team;
}

function knownTeam(id: string, teams?: Team[]): Team | undefined {
  const liveTeam = teams?.find((team) => team.id === id);
  if (liveTeam) return normalizeTeam(liveTeam);
  return TEAMS.find((team) => team.id === id);
}

export function getMatchTeam(match: Match, side: MatchSide, teams?: Team[]): MatchTeamDisplay {
  const id = side === 'home' ? match.homeId : match.awayId;
  const name = side === 'home' ? match.homeName : match.awayName;
  const flag = side === 'home' ? match.homeFlag : match.awayFlag;
  const team = knownTeam(id, teams);
  if (team) return { id: team.id, name: name ?? team.name, flag: flag ?? team.flag, knownTeam: team };

  return {
    id,
    name: name ?? id,
    flag: flag ?? id,
  };
}

/** Neutral flag shown when a team id can't be resolved from live or seed data. */
export const PLACEHOLDER_FLAG = '🏳️';

/**
 * Resolve a team purely from its id (e.g. a standings row or scorer record that
 * carries no embedded name/flag). Prefers live `teams`, falls back to the bundled
 * seed, and never returns undefined — so callers can safely read `.flag`/`.name`.
 */
export function resolveTeam(id: string, teams?: Team[]): MatchTeamDisplay {
  const team = knownTeam(id, teams);
  if (team) return { id: team.id, name: team.name, flag: team.flag, knownTeam: team };
  return { id, name: id, flag: PLACEHOLDER_FLAG };
}
