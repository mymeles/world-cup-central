/**
 * ESPN provider. ESPN exposes an undocumented-but-stable public JSON API that
 * powers their own apps. It's the richest free 2026 World Cup source: live
 * scores/status, lineups + formations, goal/card/sub events, and news.
 *
 * Everything here is best-effort and time-bounded — callers must tolerate an
 * empty result so a hiccup never breaks the app.
 */
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';

export interface EspnMatch {
  eventId: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  state: 'pre' | 'in' | 'post';
  statusDetail: string;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string;
}

export interface EspnLineupPlayer {
  name: string;
  number: number | null;
  position: string | null;
  isStarter: boolean;
  formationPlace: number | null;
}

export interface EspnLineup {
  teamAbbr: string;
  formation: string | null;
  players: EspnLineupPlayer[];
}

export interface EspnEvent {
  minute: number | null;
  type: string;
  teamAbbr: string | null;
  teamName: string | null;
  detail: string;
}

export interface EspnNews {
  headline: string;
  summary: string;
  url: string;
  published: string;
}

async function getJson(url: string, ms = 9000): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toMinute(value: unknown): number | null {
  const n = Number(String(value ?? '').match(/\d+/)?.[0] ?? '');
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Scoreboard for a given YYYYMMDD (defaults to whatever ESPN considers current). */
export async function fetchEspnScoreboard(date?: string): Promise<EspnMatch[]> {
  const body = await getJson(`${BASE}/scoreboard${date ? `?dates=${date}` : ''}`);
  const out: EspnMatch[] = [];
  for (const event of body?.events ?? []) {
    const comp = event?.competitions?.[0];
    const competitors: any[] = comp?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
    const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
    if (!home || !away) continue;
    const st = event?.status?.type ?? {};
    const state = (st.state as EspnMatch['state']) ?? 'pre';
    out.push({
      eventId: String(event.id),
      homeAbbr: home.team?.abbreviation ?? '',
      awayAbbr: away.team?.abbreviation ?? '',
      homeName: home.team?.displayName ?? '',
      awayName: away.team?.displayName ?? '',
      state,
      statusDetail: st.shortDetail ?? st.detail ?? '',
      minute: state === 'in' ? toMinute(event?.status?.displayClock ?? st.shortDetail) : null,
      homeScore: home.score != null && home.score !== '' ? Number(home.score) : null,
      awayScore: away.score != null && away.score !== '' ? Number(away.score) : null,
      kickoff: event.date ?? comp?.date ?? '',
    });
  }
  return out;
}

/** Scoreboard across a window of days around now (ESPN is day-scoped). */
export async function fetchEspnRecent(daysBack = 2, daysForward = 2): Promise<EspnMatch[]> {
  const dates: string[] = [];
  const now = new Date();
  for (let d = -daysBack; d <= daysForward; d++) {
    const day = new Date(now.getTime() + d * 86400000);
    dates.push(`${day.getUTCFullYear()}${String(day.getUTCMonth() + 1).padStart(2, '0')}${String(day.getUTCDate()).padStart(2, '0')}`);
  }
  const batches = await Promise.all(dates.map((d) => fetchEspnScoreboard(d)));
  const byId = new Map<string, EspnMatch>();
  for (const batch of batches) for (const m of batch) byId.set(m.eventId, m);
  return [...byId.values()];
}

/** Lineups (formation + XI) and key events for one ESPN event. */
export async function fetchEspnSummary(eventId: string): Promise<{ lineups: EspnLineup[]; events: EspnEvent[] }> {
  const body = await getJson(`${BASE}/summary?event=${eventId}`);
  const lineups: EspnLineup[] = [];
  for (const r of body?.rosters ?? []) {
    const players: EspnLineupPlayer[] = (r?.roster ?? []).map((p: any) => ({
      name: p?.athlete?.displayName ?? p?.athlete?.shortName ?? 'Unknown',
      number: p?.jersey != null && p.jersey !== '' ? Number(p.jersey) : null,
      position: p?.position?.abbreviation ?? null,
      isStarter: !!p?.starter,
      formationPlace: p?.formationPlace != null ? Number(p.formationPlace) : null,
    }));
    if (players.length) lineups.push({ teamAbbr: r?.team?.abbreviation ?? '', formation: r?.formation ?? null, players });
  }
  const events: EspnEvent[] = [];
  for (const e of body?.keyEvents ?? body?.plays ?? []) {
    const tt = e?.type ?? {};
    const ttype = String(tt.type ?? tt.text ?? '').toLowerCase();
    const text = String(e?.text ?? '');
    const lower = text.toLowerCase();
    let type: string | null = null;
    if (e?.scoringPlay || ttype.includes('goal') || lower.startsWith('goal!')) type = 'goal';
    else if (ttype.includes('yellow') || lower.includes('yellow card')) type = 'yellow-card';
    else if (ttype.includes('red') || lower.includes('red card') || lower.includes('second yellow')) type = 'red-card';
    else if (ttype.includes('substitution') || lower.includes('substitution')) type = 'substitution';
    if (!type) continue; // skip generic commentary; keep goals/cards/subs only

    let teamName: string | null = e?.team?.displayName ?? e?.team?.name ?? null;
    let detail = text;
    if (type === 'goal') {
      // "Goal! France 1, Senegal 0. Kylian Mbappé (France) right foot…" → scorer + team
      const m = text.match(/\.\s*([^.()]+?)\s*\(([^)]+)\)/);
      if (m) {
        detail = m[1].trim();
        teamName = m[2].trim();
      }
    } else {
      const who = (e?.athletesInvolved ?? []).map((a: any) => a?.displayName).filter(Boolean).join(', ');
      if (who) detail = who;
    }
    events.push({
      minute: toMinute(e?.clock?.displayValue ?? e?.clock?.value),
      type,
      teamAbbr: e?.team?.abbreviation ?? null,
      teamName,
      detail: detail || 'Match event',
    });
  }
  return { lineups, events };
}

/** Latest World Cup news headlines. */
export async function fetchEspnNews(limit = 8): Promise<EspnNews[]> {
  const body = await getJson(`${BASE}/news`);
  const out: EspnNews[] = [];
  for (const a of body?.articles ?? []) {
    const url = a?.links?.web?.href ?? a?.links?.mobile?.href ?? '';
    out.push({
      headline: a?.headline ?? '',
      summary: a?.description ?? '',
      url,
      published: a?.published ?? '',
    });
  }
  return out.filter((n) => n.headline).slice(0, limit);
}
