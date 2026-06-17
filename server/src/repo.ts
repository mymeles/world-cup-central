/**
 * Data access layer. All reads come from Postgres (Supabase) — never from a
 * provider at request time. This is what lets the API serve thousands of users
 * without touching ESPN/API-Football on the hot path.
 */
import { db } from './supabase.js';
import type { Lineup, Match, MatchDetail, MatchEvent, StandingRow, Team } from './types.js';
import { applyMatchCorrections, eventCorrections, scorerCorrections } from './corrections.js';
import { getProviderEvents, getProviderLineups, getProviderScorers, mergeProviderMatches } from './liveData.js';

type Row = Record<string, any>;

function mapMatch(r: Row): Match {
  return {
    id: r.id,
    source: r.source,
    stage: r.stage,
    group: r.group_code,
    matchday: r.matchday,
    homeId: r.home_team_id,
    awayId: r.away_team_id,
    homeName: r.home_name,
    awayName: r.away_name,
    kickoff: r.kickoff,
    venue: r.venue,
    city: r.city,
    status: r.status,
    homeScore: r.home_score,
    awayScore: r.away_score,
    minute: r.minute,
    featured: r.featured,
    lastUpdated: r.last_updated,
  };
}

function mapTeam(r: Row): Team {
  return {
    id: r.id,
    name: r.name,
    flag: r.flag,
    group: r.group_code,
    confederation: r.confederation,
    rank: r.fifa_rank,
    rating: r.rating,
    host: r.host,
  };
}

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await db.from('teams').select('*').order('group_code').order('rating', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTeam);
}

export async function getMatches(): Promise<Match[]> {
  const [{ data, error }, teams] = await Promise.all([
    db.from('matches').select('*').order('kickoff'),
    getTeams(),
  ]);
  if (error) throw error;
  const withProvider = await mergeProviderMatches((data ?? []).map(mapMatch), teams);
  return withProvider.map(applyMatchCorrections);
}

export async function getMatch(id: string): Promise<Match | null> {
  return (await getMatches()).find((m) => m.id === id) ?? null;
}

export function computeStandings(teamIds: string[], matches: Match[]): StandingRow[] {
  const t: Record<string, StandingRow> = {};
  for (const id of teamIds) t[id] = { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore == null || m.awayScore == null) continue;
    const h = t[m.homeId];
    const a = t[m.awayId];
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { h.won++; h.points += 3; a.lost++; }
    else if (m.homeScore < m.awayScore) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  for (const id of teamIds) t[id].gd = t[id].gf - t[id].ga;
  return Object.values(t).sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || x.teamId.localeCompare(y.teamId));
}

export async function getStandings(group: string): Promise<StandingRow[]> {
  const [{ data: teams }, matches] = await Promise.all([
    db.from('teams').select('id').eq('group_code', group),
    getMatches(),
  ]);
  const teamIds = (teams ?? []).map((r) => r.id);
  return computeStandings(teamIds, matches.filter((m) => m.group === group));
}

export async function getGroups(): Promise<string[]> {
  const { data } = await db.from('teams').select('group_code').not('group_code', 'is', null);
  return [...new Set((data ?? []).map((r) => r.group_code as string))].sort();
}

/** Top scorers aggregated from per-match player stats. */
export async function getTopScorers(limit = 12) {
  const teams = await getTeams();
  const provider = await getProviderScorers(teams);
  const { data, error } = await db
    .from('player_match_stats')
    .select('match_id, player_id, team_id, goals, assists, players(name)')
    .order('goals', { ascending: false });
  if (error) throw error;
  const acc: Record<string, { playerId: string; name: string; teamId: string; goals: number; assists: number }> = {};
  const statMatchIds = new Set<string>();
  for (const r of (data ?? []) as Row[]) {
    if (r.match_id) statMatchIds.add(r.match_id);
    if (provider.matchIds.has(r.match_id)) continue;
    const key = r.player_id;
    if (!acc[key]) acc[key] = { playerId: r.player_id, name: r.players?.name ?? r.player_id, teamId: r.team_id, goals: 0, assists: 0 };
    acc[key].goals += r.goals ?? 0;
    acc[key].assists += r.assists ?? 0;
  }
  for (const s of provider.scorers) {
    if (!acc[s.playerId]) acc[s.playerId] = { playerId: s.playerId, name: s.name, teamId: s.teamId, goals: 0, assists: 0 };
    acc[s.playerId].goals += s.goals;
    acc[s.playerId].assists += s.assists;
  }
  for (const s of scorerCorrections) {
    if (statMatchIds.has(s.matchId) || provider.matchIds.has(s.matchId)) continue;
    if (!acc[s.playerId]) acc[s.playerId] = { playerId: s.playerId, name: s.name, teamId: s.teamId, goals: 0, assists: 0 };
    acc[s.playerId].goals += s.goals;
    acc[s.playerId].assists += s.assists;
  }
  return Object.values(acc).sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, limit);
}

/** Full match detail: base match + both lineups (with grid + per-player stats) + events. */
export async function getMatchDetail(id: string): Promise<MatchDetail | null> {
  const match = await getMatch(id);
  if (!match) return null;
  const teams = await getTeams();

  const [{ data: lineups }, { data: lps }, { data: events }, { data: stats }] = await Promise.all([
    db.from('lineups').select('*').eq('match_id', id),
    db.from('lineup_players').select('*, players(name, shirt_number)').in('lineup_id', [`${id}:${match.homeId}`, `${id}:${match.awayId}`]),
    db.from('match_events').select('*').eq('match_id', id).order('minute'),
    db.from('player_match_stats').select('*').eq('match_id', id),
  ]);

  const statByPlayer: Record<string, Row> = {};
  for (const s of (stats ?? []) as Row[]) statByPlayer[s.player_id] = s;

  let builtLineups: Lineup[] = (lineups ?? []).map((l: Row) => ({
    teamId: l.team_id,
    formation: l.formation,
    players: ((lps ?? []) as Row[])
      .filter((p) => p.lineup_id === l.id)
      .map((p) => ({
        playerId: p.player_id,
        name: p.players?.name ?? p.player_id,
        number: p.players?.shirt_number ?? null,
        position: p.position,
        gridX: Number(p.grid_x),
        gridY: Number(p.grid_y),
        isStarter: p.is_starter,
        goals: statByPlayer[p.player_id]?.goals ?? 0,
        assists: statByPlayer[p.player_id]?.assists ?? 0,
        rating: statByPlayer[p.player_id]?.rating ?? null,
      })),
  }));

  // No lineups stored yet (the common case) → overlay live provider lineups
  // (ESPN, with FIFA official as the fallback) so the detail screen has them.
  if (!builtLineups.some((l) => l.players.length)) {
    builtLineups = await getProviderLineups(id, teams);
  }

  const builtEvents: MatchEvent[] = ((events ?? []) as Row[]).map((e) => ({
    id: e.id, minute: e.minute, type: e.type, teamId: e.team_id, playerId: e.player_id, detail: e.detail,
  }));
  const providerEvents = await getProviderEvents(id, teams);
  if (providerEvents.length > 0) {
    for (let i = builtEvents.length - 1; i >= 0; i--) {
      if (builtEvents[i].type === 'goal') builtEvents.splice(i, 1);
    }
  }
  const existingEventIds = new Set(builtEvents.map((e) => e.id));
  for (const e of providerEvents) {
    if (!existingEventIds.has(e.id)) builtEvents.push(e);
  }
  if (providerEvents.length === 0) {
    for (const e of eventCorrections[id] ?? []) {
      if (!existingEventIds.has(e.id)) builtEvents.push(e);
    }
  }
  builtEvents.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  return { ...applyMatchCorrections(match), lineups: builtLineups, events: builtEvents };
}
