/**
 * Monte-Carlo tournament simulator → title odds.
 *
 * We play the entire World Cup many times. Each run:
 *   1. simulates the group stage (Poisson goals from team ratings),
 *   2. ranks groups, takes the top two of each plus the eight best third-placed
 *      teams (the 2026 format: 32 advance to the Round of 32),
 *   3. plays a single-elimination knockout using a logistic win model.
 * Counting how often each nation wins gives an honest probability estimate.
 */

import type { StandingRow, Team } from '../types';
import { GROUPS, TEAMS } from '../data/worldcup';
import { seededRng, samplePoisson, expectedGoals, computeStandings } from './predict';

export interface TitleOdds {
  teamId: string;
  champion: number;
  finalist: number;
  semifinalist: number;
}

const LOGISTIC_D = 220; // rating points per "decade" of odds

function winProbability(home: Team, away: Team): number {
  const adv = (home.host ? 35 : 0) - (away.host ? 35 : 0);
  const diff = home.rating - away.rating + adv;
  return 1 / (1 + Math.pow(10, -diff / LOGISTIC_D));
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function runTournamentSim(iterations = 1200): TitleOdds[] {
  const champion: Record<string, number> = {};
  const finalist: Record<string, number> = {};
  const semifinalist: Record<string, number> = {};
  for (const t of TEAMS) {
    champion[t.id] = 0;
    finalist[t.id] = 0;
    semifinalist[t.id] = 0;
  }

  for (let it = 0; it < iterations; it++) {
    const rng = seededRng(`sim-${it}`);

    // --- Group stage ---
    const qualifiers: Team[] = [];
    const thirds: { row: StandingRow; team: Team }[] = [];

    for (const g of GROUPS) {
      const groupTeams = TEAMS.filter((t) => t.group === g);
      const matches = [];
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const home = groupTeams[i];
          const away = groupTeams[j];
          const { expHomeGoals, expAwayGoals } = expectedGoals(home, away);
          matches.push({
            id: `${g}${i}${j}`,
            stage: 'Group' as const,
            homeId: home.id,
            awayId: away.id,
            kickoff: '',
            venue: '',
            city: '',
            status: 'finished' as const,
            homeScore: samplePoisson(expHomeGoals, rng),
            awayScore: samplePoisson(expAwayGoals, rng),
          });
        }
      }
      const table = computeStandings(groupTeams.map((t) => t.id), matches);
      qualifiers.push(TEAMS.find((t) => t.id === table[0].teamId)!);
      qualifiers.push(TEAMS.find((t) => t.id === table[1].teamId)!);
      thirds.push({ row: table[2], team: TEAMS.find((t) => t.id === table[2].teamId)! });
    }

    // Eight best third-placed teams advance.
    thirds.sort((a, b) => b.row.points - a.row.points || b.row.gd - a.row.gd || b.row.gf - a.row.gf);
    for (let i = 0; i < 8; i++) qualifiers.push(thirds[i].team);

    // --- Knockout (single elimination, randomised bracket) ---
    let round = shuffle(qualifiers, rng);
    while (round.length > 1) {
      // Mark survivors of this round before playing it.
      if (round.length === 4) for (const t of round) semifinalist[t.id]++;
      if (round.length === 2) for (const t of round) finalist[t.id]++;
      const next: Team[] = [];
      for (let i = 0; i < round.length; i += 2) {
        const a = round[i];
        const b = round[i + 1];
        next.push(rng() < winProbability(a, b) ? a : b);
      }
      round = next;
    }
    champion[round[0].id]++;
  }

  return TEAMS.map((t) => ({
    teamId: t.id,
    champion: champion[t.id] / iterations,
    finalist: finalist[t.id] / iterations,
    semifinalist: semifinalist[t.id] / iterations,
  })).sort((a, b) => b.champion - a.champion);
}
