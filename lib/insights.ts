/**
 * Shared football intelligence used by the AI endpoint.
 *
 *  - buildContext()      → a compact, grounded snapshot injected as the LLM's
 *                          system context so answers cite real numbers.
 *  - buildLocalAnswer()  → a capable rule-based responder so the AI tab still
 *                          works with zero API keys (demo / offline mode).
 */

import { TEAMS, NOW, getTeam, currentMatches } from '../data/worldcup';
import { computeStandings, predictMatch } from './predict';
import { runTournamentSim, type TitleOdds } from './simulate';
import { GROUPS } from '../data/worldcup';
import { kickoffTime, dayKey, pct } from './format';

let cachedOdds: TitleOdds[] | null = null;
function getOdds(): TitleOdds[] {
  if (!cachedOdds) cachedOdds = runTournamentSim(600);
  return cachedOdds;
}

function findTeams(text: string) {
  const t = text.toLowerCase();
  return TEAMS.filter((team) => t.includes(team.name.toLowerCase()) || t.includes(team.id.toLowerCase()));
}

function teamOdds(teamId: string) {
  return getOdds().find((o) => o.teamId === teamId);
}

function nextMatchFor(teamId: string) {
  return currentMatches().find((m) => (m.homeId === teamId || m.awayId === teamId) && m.status !== 'finished');
}

function summarizeTeam(teamId: string): string {
  const team = getTeam(teamId);
  const odds = teamOdds(teamId);
  const standings = computeStandings(
    TEAMS.filter((t) => t.group === team.group).map((t) => t.id),
    currentMatches().filter((m) => m.group === team.group),
  );
  const pos = standings.findIndex((r) => r.teamId === teamId) + 1;
  const next = nextMatchFor(teamId);
  let s = `${team.flag} ${team.name} — FIFA #${team.rank}, Group ${team.group} (currently ${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}). `;
  if (odds) s += `Title odds ${pct(odds.champion)}, reaching the final ${pct(odds.finalist)}. `;
  if (next) {
    const opp = getTeam(next.homeId === teamId ? next.awayId : next.homeId);
    s += `Next up: vs ${opp.name}.`;
  }
  return s;
}

function matchup(aId: string, bId: string): string {
  const a = getTeam(aId);
  const b = getTeam(bId);
  const p = predictMatch(a, b);
  return `${a.flag} ${a.name} vs ${b.flag} ${b.name}: ${a.name} win ${pct(p.homeWin)}, draw ${pct(p.draw)}, ${b.name} win ${pct(p.awayWin)}. Expected goals ${p.expHomeGoals.toFixed(1)}–${p.expAwayGoals.toFixed(1)}, most likely score ${p.likelyScore.home}–${p.likelyScore.away}.`;
}

export function buildContext(): string {
  const today = NOW.toISOString().slice(0, 10);
  const todays = currentMatches().filter((m) => dayKey(m.kickoff) === today);
  const odds = getOdds().slice(0, 6);

  const leaders = GROUPS.map((g) => {
    const rows = computeStandings(
      TEAMS.filter((t) => t.group === g).map((t) => t.id),
      currentMatches().filter((m) => m.group === g),
    );
    return `${g}: ${getTeam(rows[0].teamId).name} ${rows[0].points}pts`;
  }).join(' | ');

  return [
    `TOURNAMENT: 2026 FIFA World Cup (USA/Canada/Mexico). Reference date: ${today}.`,
    `TITLE ODDS (model): ${odds.map((o) => `${getTeam(o.teamId).name} ${pct(o.champion)}`).join(', ')}.`,
    `GROUP LEADERS: ${leaders}.`,
    'TOP SCORERS: scorer feed is not connected yet; do not invent player goal totals.',
    `TODAY'S currentMatches(): ${todays.map((m) => `${getTeam(m.homeId).name} v ${getTeam(m.awayId).name} ${kickoffTime(m.kickoff)}`).join('; ') || 'none'}.`,
  ].join('\n');
}

/** Rule-based fallback answer when no AI provider key is configured. */
export function buildLocalAnswer(question: string): string {
  const q = question.toLowerCase();
  const teams = findTeams(question);

  if ((q.includes('predict') || q.includes(' vs ') || q.includes('beat') || q.includes('win against')) && teams.length >= 2) {
    return matchup(teams[0].id, teams[1].id);
  }
  if (q.includes('scorer') || q.includes('golden boot') || q.includes('goals')) {
    return 'The Golden Boot feed is not connected yet, so I should not list player goal totals. Add a sports data provider with scorer coverage to enable this.';
  }
  if (q.includes('favorite') || q.includes('favourite') || q.includes('odds') || q.includes('win the world cup') || q.includes('who will win')) {
    return 'Model title favourites: ' + getOdds().slice(0, 6).map((o) => `${getTeam(o.teamId).name} ${pct(o.champion)}`).join(', ') + '.';
  }
  if (q.includes('today') || q.includes('fixtures') || q.includes('schedule') || q.includes('playing')) {
    const today = NOW.toISOString().slice(0, 10);
    const todays = currentMatches().filter((m) => dayKey(m.kickoff) === today);
    return todays.length
      ? "Today's matches: " + todays.map((m) => `${getTeam(m.homeId).name} v ${getTeam(m.awayId).name} (${kickoffTime(m.kickoff)})`).join(', ') + '.'
      : 'No matches scheduled today.';
  }
  if (teams.length === 1) {
    return summarizeTeam(teams[0].id);
  }

  return [
    "I'm your World Cup analyst. Ask me things like:",
    '• “Predict Argentina vs France”',
    '• “Who are the favourites to win?”',
    '• “Tell me about Morocco”',
    '• “Who’s leading the Golden Boot?”',
    '',
    '(Connect an AI provider key for open-ended conversation — see DATA_SOURCES.md.)',
  ].join('\n');
}
