import type { Match, MatchEvent, Team } from './types.js';

const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const WORLDCUP26_URL = 'https://worldcup26.ir/get/games';
const CACHE_TTL_MS = 90_000;

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
}

let payloadCache: { expiresAt: number; payload: ProviderPayload | null } = { expiresAt: 0, payload: null };

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

function slug(s: string): string {
  return norm(s).replace(/\s+/g, '-').slice(0, 40);
}

function teamIndex(teams: Team[]): Record<string, string> {
  const idx: Record<string, string> = {};
  for (const team of teams) {
    idx[norm(team.name)] = team.id;
    idx[team.id.toLowerCase()] = team.id;
  }
  idx[norm('South Korea')] = 'KOR';
  idx[norm('Korea Republic')] = 'KOR';
  idx[norm('USA')] = 'USA';
  idx[norm('United States')] = 'USA';
  idx[norm('DR Congo')] = 'COD';
  idx[norm('D.R. Congo')] = 'COD';
  idx[norm('Bosnia and Herzegovina')] = 'BIH';
  return idx;
}

function isoFromOpenfootball(date: string, time: string): string {
  const m = String(time || '').match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  const hh = m ? +m[1] : 12;
  const mm = m ? +m[2] : 0;
  const off = m ? +m[3] : 0;
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

function addGoal(
  payload: ProviderPayload,
  matchId: string,
  teamId: string,
  goal: { name?: string; minute?: string | number },
  index: number,
) {
  const name = String(goal.name ?? '').trim();
  if (!name) return;
  const minute = Number(String(goal.minute ?? '').match(/\d+/)?.[0] ?? '') || null;
  const playerId = `of-${teamId.toLowerCase()}-${slug(name)}`;
  payload.scorers.push({ matchId, playerId, name, teamId, goals: 1, assists: 0 });
  payload.events[matchId] ??= [];
  payload.events[matchId].push({
    id: `${matchId}:${minute ?? 'na'}:${teamId}:${slug(name)}:${index}`,
    minute,
    type: 'goal',
    teamId,
    playerId,
    detail: name,
  });
}

async function fetchOpenfootball(teams: Team[]): Promise<ProviderPayload> {
  const idx = teamIndex(teams);
  const teamById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const res = await fetch(OPENFOOTBALL_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`openfootball ${res.status}`);
  const body = await res.json() as { matches?: any[] };
  const payload: ProviderPayload = {
    fetchedAt: new Date().toISOString(),
    matches: [],
    matchIds: new Set<string>(),
    scorers: [],
    events: {},
  };

  for (const item of body.matches ?? []) {
    if (!/^Group [A-L]$/.test(item.group || '')) continue;
    const group = item.group.replace('Group ', '');
    const homeId = idx[norm(item.team1 ?? '')];
    const awayId = idx[norm(item.team2 ?? '')];
    if (!homeId || !awayId) continue;

    const id = `wc-${group}-${homeId}-${awayId}`;
    const ft = item.score?.ft;
    payload.matchIds.add(id);
    payload.matches.push({
      id,
      source: 'openfootball-live',
      stage: stageFromRound(item.round ?? 'Group'),
      group,
      matchday: matchdayFromRound(item.round ?? ''),
      homeId,
      awayId,
      homeName: teamById[homeId]?.name ?? item.team1 ?? homeId,
      awayName: teamById[awayId]?.name ?? item.team2 ?? awayId,
      homeFlag: teamById[homeId]?.flag ?? null,
      awayFlag: teamById[awayId]?.flag ?? null,
      kickoff: isoFromOpenfootball(item.date, item.time),
      venue: item.ground ?? null,
      city: item.ground ?? null,
      status: ft ? 'finished' : 'scheduled',
      homeScore: ft ? ft[0] : null,
      awayScore: ft ? ft[1] : null,
      minute: null,
      featured: false,
      lastUpdated: payload.fetchedAt,
    });

    let eventIndex = 0;
    for (const goal of item.goals1 ?? []) addGoal(payload, id, homeId, goal, eventIndex++);
    for (const goal of item.goals2 ?? []) addGoal(payload, id, awayId, goal, eventIndex++);
  }

  return payload;
}

async function fetchWorldcup26Live(teams: Team[], base: ProviderPayload): Promise<void> {
  try {
    const idx = teamIndex(teams);
    const res = await fetch(WORLDCUP26_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return;
    const body = await res.json() as any;
    const games: any[] = Array.isArray(body) ? body : body.data ?? body.games ?? body.results ?? [];
    for (const game of games) {
      const blob = JSON.stringify(game).toLowerCase();
      const isLive = /live|playing|in.?progress|first.?half|second.?half|half.?time/.test(blob);
      if (!isLive) continue;

      const homeId = idx[norm(game.team1 ?? game.home ?? game.home_team ?? '')];
      const awayId = idx[norm(game.team2 ?? game.away ?? game.away_team ?? '')];
      if (!homeId || !awayId) continue;

      const match = base.matches.find((m) => m.homeId === homeId && m.awayId === awayId);
      if (!match || match.status === 'finished') continue;
      const hs = Number(game.score1 ?? game.home_score ?? game.homeScore);
      const as = Number(game.score2 ?? game.away_score ?? game.awayScore);
      match.status = 'live';
      match.source = 'worldcup26-live';
      match.homeScore = Number.isFinite(hs) ? hs : null;
      match.awayScore = Number.isFinite(as) ? as : null;
      match.minute = Number(String(game.minute ?? game.time ?? '').match(/\d+/)?.[0] ?? '') || null;
      match.lastUpdated = new Date().toISOString();
    }
  } catch {
    // Best-effort in-play overlay only. Keep openfootball/Supabase data if down.
  }
}

export async function getProviderPayload(teams: Team[]): Promise<ProviderPayload | null> {
  const now = Date.now();
  if (payloadCache.payload && payloadCache.expiresAt > now) return payloadCache.payload;

  try {
    const payload = await fetchOpenfootball(teams);
    await fetchWorldcup26Live(teams, payload);
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

export async function getProviderEvents(matchId: string, teams: Team[]): Promise<MatchEvent[]> {
  const payload = await getProviderPayload(teams);
  return payload?.events[matchId] ?? [];
}
