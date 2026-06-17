/**
 * Unified live-data provider (read path). Combines three free sources so each
 * covers what the others lack:
 *
 *   - openfootball (GitHub JSON): the full group-stage fixture backbone + finals.
 *   - ESPN JSON API: freshest live scores/status/minute, lineups, events, news.
 *   - FIFA api.fifa.com: the OFFICIAL source — authoritative final scores and
 *     starting lineups, used to corroborate ESPN and fill its gaps.
 *
 * Data flows one way (providers → app). Everything is cached + time-bounded and
 * degrades gracefully: if a source is down we keep the last good data.
 */
import type { Lineup, Match, MatchEvent, Team } from './types.js';
import {
  fetchEspnNews,
  fetchEspnRecent,
  fetchEspnSummary,
  type EspnLineup,
  type EspnEvent,
  type EspnMatch,
} from './providers/espn.js';
import { fetchFifaLineups, fetchFifaMatches, type FifaLineup, type FifaMatch } from './providers/fifa.js';

const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const CACHE_TTL_MS = 60_000;
const SUMMARY_TTL_MS = 60_000;
const NEWS_TTL_MS = 5 * 60_000;

export interface NewsItem {
  headline: string;
  summary: string;
  url: string;
  published: string;
  source: string;
}

interface ProviderScorer {
  matchId: string;
  playerId: string;
  name: string;
  teamId: string;
  goals: number;
  assists: number;
}

interface ProviderPayload {
  fetchedAt: string;
  matches: Match[];
  matchIds: Set<string>;
  scorers: ProviderScorer[];
  events: Record<string, MatchEvent[]>;
  espnEventByMatch: Record<string, string>;
  fifaByMatch: Record<string, { idStage: string; idMatch: string }>;
}

let payloadCache: { expiresAt: number; payload: ProviderPayload | null } = { expiresAt: 0, payload: null };
const summaryCache = new Map<string, { expiresAt: number; value: Awaited<ReturnType<typeof fetchEspnSummary>> }>();
const lineupCache = new Map<string, { expiresAt: number; value: Lineup[] }>();
let newsCache: { expiresAt: number; value: NewsItem[] } = { expiresAt: 0, value: [] };

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}
function slug(s: string): string {
  return norm(s).replace(/\s+/g, '-').slice(0, 40);
}

interface TeamResolver {
  ids: Set<string>;
  byName: Record<string, string>;
}

function teamResolver(teams: Team[]): TeamResolver {
  const byName: Record<string, string> = {};
  const ids = new Set<string>();
  for (const t of teams) {
    ids.add(t.id);
    byName[norm(t.name)] = t.id;
    byName[t.id.toLowerCase()] = t.id;
  }
  // Common provider name variants → our ids.
  const alias: Record<string, string> = {
    'south korea': 'KOR', 'korea republic': 'KOR', czechia: 'CZE', 'czech republic': 'CZE',
    'united states': 'USA', usa: 'USA', 'ir iran': 'IRN', iran: 'IRN', turkiye: 'TUR', turkey: 'TUR',
    'dr congo': 'COD', 'd r congo': 'COD', 'cote divoire': 'CIV', 'ivory coast': 'CIV',
    'bosnia and herzegovina': 'BIH', 'cape verde islands': 'CPV', 'cabo verde': 'CPV',
  };
  for (const [k, v] of Object.entries(alias)) if (ids.has(v)) byName[norm(k)] = v;
  return { ids, byName };
}

/** Resolve a provider team (abbreviation + name) to our 3-letter team id. */
function resolveId(r: TeamResolver, abbr: string, name: string): string | null {
  const a = (abbr || '').toUpperCase();
  if (a && r.ids.has(a)) return a;
  const byName = r.byName[norm(name)];
  if (byName) return byName;
  const byAbbr = r.byName[(abbr || '').toLowerCase()];
  return byAbbr ?? null;
}

function isoFromOpenfootball(date: string, time: string): string {
  const m = String(time || '').match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  const hh = m ? +m[1] : 12, mm = m ? +m[2] : 0, off = m ? +m[3] : 0;
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + ((hh - off) * 60 + mm) * 60000).toISOString();
}
function stageFromRound(round: string): string {
  if (round === 'Match for third place') return 'Third place';
  return round.startsWith('Matchday') ? 'Group' : round;
}
function matchdayFromRound(round: string): number | null {
  const m = /Matchday (\d+)/.exec(round);
  return m ? Number(m[1]) : null;
}

function addGoal(payload: ProviderPayload, matchId: string, teamId: string, goal: { name?: string; minute?: string | number }, index: number) {
  const name = String(goal.name ?? '').trim();
  if (!name) return;
  const minute = Number(String(goal.minute ?? '').match(/\d+/)?.[0] ?? '') || null;
  const playerId = `of-${teamId.toLowerCase()}-${slug(name)}`;
  payload.scorers.push({ matchId, playerId, name, teamId, goals: 1, assists: 0 });
  payload.events[matchId] ??= [];
  payload.events[matchId].push({ id: `${matchId}:${minute ?? 'na'}:${teamId}:${slug(name)}:${index}`, minute, type: 'goal', teamId, playerId, detail: name });
}

/** openfootball backbone: full group-stage fixtures + final results + goals. */
async function fetchOpenfootball(teams: Team[], r: TeamResolver): Promise<ProviderPayload> {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const res = await fetch(OPENFOOTBALL_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`openfootball ${res.status}`);
  const body = (await res.json()) as { matches?: any[] };
  const payload: ProviderPayload = {
    fetchedAt: new Date().toISOString(),
    matches: [], matchIds: new Set(), scorers: [], events: {}, espnEventByMatch: {}, fifaByMatch: {},
  };
  for (const item of body.matches ?? []) {
    if (!/^Group [A-L]$/.test(item.group || '')) continue;
    const group = item.group.replace('Group ', '');
    const homeId = resolveId(r, '', item.team1 ?? '');
    const awayId = resolveId(r, '', item.team2 ?? '');
    if (!homeId || !awayId) continue;
    const id = `wc-${group}-${homeId}-${awayId}`;
    const ft = item.score?.ft;
    payload.matchIds.add(id);
    payload.matches.push({
      id, source: 'openfootball', stage: stageFromRound(item.round ?? 'Group'), group,
      matchday: matchdayFromRound(item.round ?? ''), homeId, awayId,
      homeName: teamById[homeId]?.name ?? item.team1 ?? homeId, awayName: teamById[awayId]?.name ?? item.team2 ?? awayId,
      homeFlag: teamById[homeId]?.flag ?? null, awayFlag: teamById[awayId]?.flag ?? null,
      kickoff: isoFromOpenfootball(item.date, item.time), venue: item.ground ?? null, city: item.ground ?? null,
      status: ft ? 'finished' : 'scheduled', homeScore: ft ? ft[0] : null, awayScore: ft ? ft[1] : null,
      minute: null, featured: false, lastUpdated: payload.fetchedAt,
    });
    let i = 0;
    for (const goal of item.goals1 ?? []) addGoal(payload, id, homeId, goal, i++);
    for (const goal of item.goals2 ?? []) addGoal(payload, id, awayId, goal, i++);
  }
  return payload;
}

/** Overlay ESPN + FIFA scores/status/minute onto the openfootball backbone. */
function overlayLiveSources(payload: ProviderPayload, r: TeamResolver, espn: EspnMatch[], fifa: FifaMatch[]) {
  const byPair = new Map<string, Match>();
  for (const m of payload.matches) byPair.set(`${m.homeId}>${m.awayId}`, m);
  const find = (h: string, a: string): { match: Match; swap: boolean } | null => {
    const direct = byPair.get(`${h}>${a}`);
    if (direct) return { match: direct, swap: false };
    const rev = byPair.get(`${a}>${h}`);
    return rev ? { match: rev, swap: true } : null;
  };
  const now = new Date().toISOString();

  for (const em of espn) {
    const h = resolveId(r, em.homeAbbr, em.homeName);
    const a = resolveId(r, em.awayAbbr, em.awayName);
    if (!h || !a) continue;
    const hit = find(h, a);
    if (!hit) continue;
    const { match, swap } = hit;
    payload.espnEventByMatch[match.id] = em.eventId;
    const hs = swap ? em.awayScore : em.homeScore;
    const as = swap ? em.homeScore : em.awayScore;
    if (em.state === 'in') {
      match.status = 'live'; match.homeScore = hs; match.awayScore = as; match.minute = em.minute; match.source = 'espn'; match.lastUpdated = now;
    } else if (em.state === 'post') {
      match.status = 'finished';
      if (hs != null) match.homeScore = hs;
      if (as != null) match.awayScore = as;
      match.source = 'espn';
    }
  }

  for (const fm of fifa) {
    const h = resolveId(r, fm.homeAbbr, fm.homeName);
    const a = resolveId(r, fm.awayAbbr, fm.awayName);
    if (!h || !a) continue;
    const hit = find(h, a);
    if (!hit) continue;
    const { match, swap } = hit;
    payload.fifaByMatch[match.id] = { idStage: fm.idStage, idMatch: fm.idMatch };
    const hs = swap ? fm.awayScore : fm.homeScore;
    const as = swap ? fm.homeScore : fm.awayScore;
    // FIFA is authoritative for official finals; never override a live ESPN state.
    if (match.status === 'live') continue;
    if (fm.status === 'finished') {
      match.status = 'finished';
      if (hs != null) match.homeScore = hs;
      if (as != null) match.awayScore = as;
      if (match.source === 'openfootball') match.source = 'fifa';
    } else if (fm.status === 'live') {
      match.status = 'live'; match.homeScore = hs; match.awayScore = as; match.minute = fm.minute; match.source = 'fifa'; match.lastUpdated = now;
    }
  }
}

async function buildPayload(teams: Team[]): Promise<ProviderPayload> {
  const r = teamResolver(teams);
  const payload = await fetchOpenfootball(teams, r); // backbone (throws → caller keeps cache)
  const [espn, fifa] = await Promise.all([
    fetchEspnRecent(2, 2).catch(() => [] as EspnMatch[]),
    fetchFifaMatches().catch(() => [] as FifaMatch[]),
  ]);
  overlayLiveSources(payload, r, espn, fifa);
  return payload;
}

export async function getProviderPayload(teams: Team[]): Promise<ProviderPayload | null> {
  const now = Date.now();
  if (payloadCache.payload && payloadCache.expiresAt > now) return payloadCache.payload;
  try {
    const payload = await buildPayload(teams);
    payloadCache = { expiresAt: now + CACHE_TTL_MS, payload };
    return payload;
  } catch {
    return payloadCache.payload;
  }
}

export async function mergeProviderMatches(matches: Match[], teams: Team[]): Promise<Match[]> {
  const payload = await getProviderPayload(teams);
  if (!payload) return matches;
  const merged = new Map(matches.map((m) => [m.id, m]));
  for (const match of payload.matches) {
    const existing = merged.get(match.id);
    merged.set(match.id, existing ? { ...existing, ...match, featured: existing.featured ?? match.featured } : match);
  }
  return [...merged.values()].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
}

export async function getProviderScorers(teams: Team[]) {
  const payload = await getProviderPayload(teams);
  return payload ? { matchIds: payload.matchIds, scorers: payload.scorers } : { matchIds: new Set<string>(), scorers: [] };
}

async function getEspnSummary(eventId: string) {
  const now = Date.now();
  const cached = summaryCache.get(eventId);
  if (cached && cached.expiresAt > now) return cached.value;
  const value = await fetchEspnSummary(eventId).catch(() => ({ lineups: [] as EspnLineup[], events: [] as EspnEvent[] }));
  summaryCache.set(eventId, { expiresAt: now + SUMMARY_TTL_MS, value });
  return value;
}

/** Match events overlay — ESPN goals/cards (richer) when available, else openfootball goals. */
export async function getProviderEvents(matchId: string, teams: Team[]): Promise<MatchEvent[]> {
  const payload = await getProviderPayload(teams);
  if (!payload) return [];
  const r = teamResolver(teams);
  const eventId = payload.espnEventByMatch[matchId];
  if (eventId) {
    const sum = await getEspnSummary(eventId);
    if (sum.events.length) {
      return sum.events.map((e, i) => ({
        id: `espn:${matchId}:${e.minute ?? 'na'}:${i}:${slug(e.detail)}`,
        minute: e.minute,
        type: e.type,
        teamId: e.teamName ? resolveId(r, '', e.teamName) : e.teamAbbr ? resolveId(r, e.teamAbbr, '') : null,
        playerId: null,
        detail: e.detail,
      }));
    }
  }
  return payload.events[matchId] ?? [];
}

function isGoalkeeper(position: string | null): boolean {
  const p = (position || '').toUpperCase();
  return p === 'G' || p === 'GK' || p.startsWith('GOAL');
}

/** Row band from a position abbreviation: 1=def, 2=holding mid, 3=attacking mid, 4=forward. */
function positionBand(position: string | null): 1 | 2 | 3 | 4 {
  const raw = (position || '').toUpperCase();
  if (raw === 'DEF') return 1; // FIFA full-word forms
  if (raw === 'MID') return 2;
  if (raw === 'FWD') return 4;
  const p = raw.replace(/[^A-Z]/g, ''); // 'CF-L' → 'CFL'
  if (p.includes('WB') || p === 'SW') return 1; // wing-back / sweeper = defender
  if (p.includes('W') || p.endsWith('F') || p.startsWith('F') || p.includes('ST') || p.includes('CF') || p.includes('SS')) return 4; // forward/winger
  if (p.includes('M')) return p.includes('A') ? 3 : 2; // attacking (AM/CAM) vs holding/central mid
  if (p.endsWith('B') || p.startsWith('D') || p.startsWith('CB') || p.startsWith('CD')) return 1; // defender
  return 2;
}

/** Left→right hint from a position abbreviation for ordering players within a row. */
function lrHint(position: string | null): number {
  const p = (position || '').toUpperCase();
  if (p.startsWith('L') || p.includes('-L') || /L$/.test(p)) return -1;
  if (p.startsWith('R') || p.includes('-R') || /R$/.test(p)) return 1;
  return 0;
}

interface Placeable {
  position: string | null;
  number: number | null;
  formationPlace: number | null;
}

/**
 * Normalized pitch coords (x,y in 0..1; y: 0 = own goal line → 1 = attack).
 * Players are bucketed by position band — reliable across providers — rather than
 * ESPN's opaque formationPlace. The formation string is used only as a label.
 */
function layoutStarters<T extends Placeable>(starters: T[]): Map<T, { x: number; y: number }> {
  const coords = new Map<T, { x: number; y: number }>();
  const gk = starters.filter((p) => isGoalkeeper(p.position));
  const out = starters.filter((p) => !isGoalkeeper(p.position));
  const band = (b: number) => out.filter((p) => positionBand(p.position) === b);

  const rows = [gk, band(1), band(2), band(3), band(4)].filter((row) => row.length > 0);
  const R = rows.length;
  rows.forEach((row, ri) => {
    const y = R <= 1 ? 0.5 : ri / (R - 1);
    const ordered = [...row].sort((a, b) => lrHint(a.position) - lrHint(b.position) || (a.number ?? 99) - (b.number ?? 99));
    ordered.forEach((p, j) => coords.set(p, { x: (j + 1) / (ordered.length + 1), y }));
  });
  return coords;
}

function toLineup(src: EspnLineup | FifaLineup, matchId: string, sourceTag: string, r: TeamResolver): Lineup {
  const teamId = resolveId(r, src.teamAbbr, '') ?? src.teamAbbr;
  const list: Array<{ name: string; number: number | null; position: string | null; isStarter: boolean; formationPlace?: number | null; image?: string | null }> = src.players;
  const norm = list.map((p) => ({
    name: p.name,
    number: p.number,
    position: p.position,
    isStarter: p.isStarter,
    formationPlace: p.formationPlace ?? null,
    image: p.image ?? null,
  }));
  const coords = layoutStarters(norm.filter((p) => p.isStarter));
  return {
    teamId,
    formation: src.formation,
    players: norm.map((p) => {
      const c = coords.get(p);
      return {
        playerId: `${sourceTag}-${teamId.toLowerCase()}-${slug(p.name)}`,
        name: p.name,
        number: p.number,
        position: p.position,
        gridX: c?.x ?? 0,
        gridY: c?.y ?? 0,
        isStarter: p.isStarter,
        image: p.image,
      };
    }),
  };
}

/** Lineups overlay — ESPN first (rich), FIFA official as the gap-filler. */
export async function getProviderLineups(matchId: string, teams: Team[]): Promise<Lineup[]> {
  const now = Date.now();
  const cached = lineupCache.get(matchId);
  if (cached && cached.expiresAt > now) return cached.value;

  const payload = await getProviderPayload(teams);
  const r = teamResolver(teams);
  let lineups: Lineup[] = [];

  const eventId = payload?.espnEventByMatch[matchId];
  if (eventId) {
    const sum = await getEspnSummary(eventId);
    lineups = sum.lineups.map((l) => toLineup(l, matchId, 'espn', r));
  }
  if (!lineups.length) {
    const f = payload?.fifaByMatch[matchId];
    if (f) {
      const fl = await fetchFifaLineups(f.idStage, f.idMatch).catch(() => [] as FifaLineup[]);
      lineups = fl.map((l) => toLineup(l, matchId, 'fifa', r));
    }
  }
  lineupCache.set(matchId, { expiresAt: now + SUMMARY_TTL_MS, value: lineups });
  return lineups;
}

/** Latest World Cup news (ESPN) for the AI analyst. */
export async function getLatestNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (newsCache.value.length && newsCache.expiresAt > now) return newsCache.value;
  const articles = await fetchEspnNews(10).catch(() => []);
  const value: NewsItem[] = articles.map((a) => ({ ...a, source: 'ESPN' }));
  if (value.length) newsCache = { expiresAt: now + NEWS_TTL_MS, value };
  return value;
}
