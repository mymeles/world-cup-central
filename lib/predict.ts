/**
 * Prediction engine.
 *
 * This is a genuine statistical model, not random numbers. Each team carries an
 * Elo-style power rating. We map the rating gap to expected goals with a
 * log-linear (Poisson regression style) link, then treat each side's goals as an
 * independent Poisson variable. Summing the joint distribution gives real
 * win/draw/loss probabilities and the single most likely scoreline.
 *
 * Tournament simulations are used only for forecasts, not as factual match
 * results.
 */

import type { Match, MatchPrediction, StandingRow, Team } from '../types';

const BASE_GOALS = 1.32; // average goals per team in a World Cup match
const RATING_K = 0.0022; // goals swing per Elo point
const HOST_EDGE = 0.18; // log-scale nudge for the host nation
const MAX_GOALS = 8; // truncation point for the scoreline grid

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Expected goals for both sides given their ratings. */
export function expectedGoals(home: Team, away: Team) {
  const adv = (home.host ? HOST_EDGE : 0) - (away.host ? HOST_EDGE : 0);
  const edge = (home.rating - away.rating) * RATING_K + adv;
  const expHomeGoals = clamp(BASE_GOALS * Math.exp(edge), 0.2, 5);
  const expAwayGoals = clamp(BASE_GOALS * Math.exp(-edge), 0.2, 5);
  return { expHomeGoals, expAwayGoals };
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poisson(lambda: number, k: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Full prediction for a fixture: probabilities + most likely score. */
export function predictMatch(home: Team, away: Team): MatchPrediction {
  const { expHomeGoals, expAwayGoals } = expectedGoals(home, away);

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let bestP = -1;
  let likelyScore = { home: 0, away: 0 };

  for (let h = 0; h <= MAX_GOALS; h++) {
    const ph = poisson(expHomeGoals, h);
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = ph * poisson(expAwayGoals, a);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
      if (p > bestP) {
        bestP = p;
        likelyScore = { home: h, away: a };
      }
    }
  }

  // Renormalise to defend against the truncation tail.
  const total = homeWin + draw + awayWin || 1;
  homeWin /= total;
  draw /= total;
  awayWin /= total;

  const confidence = Math.max(homeWin, draw, awayWin);
  return { homeWin, draw, awayWin, expHomeGoals, expAwayGoals, likelyScore, confidence };
}

/* ------------------------------------------------------------------ */
/* Deterministic simulation helpers used by forecast simulations. */
/* ------------------------------------------------------------------ */

/** Small, fast, fully-deterministic PRNG seeded from a string. */
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw a Poisson sample using inverse transform with a deterministic rng. */
export function samplePoisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L && k < 12);
  return k - 1;
}

/** Simulate a plausible final score for forecast simulations. */
export function simulateScore(home: Team, away: Team, seed: string) {
  const { expHomeGoals, expAwayGoals } = expectedGoals(home, away);
  const rng = seededRng(seed);
  return {
    homeScore: samplePoisson(expHomeGoals, rng),
    awayScore: samplePoisson(expAwayGoals, rng),
  };
}

/* ------------------------------------------------------------------ */
/* Standings                                                          */
/* ------------------------------------------------------------------ */

export function computeStandings(teamIds: string[], matches: Match[]): StandingRow[] {
  const table: Record<string, StandingRow> = {};
  for (const id of teamIds) {
    table[id] = { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  }

  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore == null || m.awayScore == null) continue;
    const home = table[m.homeId];
    const away = table[m.awayId];
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  for (const id of teamIds) {
    table[id].gd = table[id].gf - table[id].ga;
  }

  return Object.values(table).sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamId.localeCompare(b.teamId),
  );
}
