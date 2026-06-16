/**
 * Ingestion worker. The ONLY component that talks to providers. Users always
 * read the DB, so provider cadence/uptime never affects app latency.
 *
 * Providers (all free, no API key):
 *  - openfootball (GitHub raw JSON): reliable backbone — fixtures, final results,
 *    goalscorers. Effectively unlimited; refreshed every few hours.
 *  - worldcup26.ir: best-effort live in-play overlay during match windows. Hobby
 *    project, so every call is wrapped — if it's down, we keep the last good data
 *    and the app shows "waiting for live data" rather than anything invented.
 *
 * No lineups/formations: no free 2026 source provides them (paid only).
 */
import { config, hasWriteAccess } from './config.js';
import { db, dbWrite } from './supabase.js';

const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const WORLDCUP26_URL = 'https://worldcup26.ir/get/games';
const LIVE_WINDOW_MS = 130 * 60 * 1000;

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

async function teamIndex(): Promise<Record<string, string>> {
  const { data } = await db.from('teams').select('id, name');
  const idx: Record<string, string> = {};
  for (const t of data ?? []) {
    idx[norm(t.name)] = t.id;
    idx[t.id.toLowerCase()] = t.id;
  }
  return idx;
}

function isoFromOf(date: string, time: string): string {
  const m = String(time || '').match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  const hh = m ? +m[1] : 12, mm = m ? +m[2] : 0, off = m ? +m[3] : 0;
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + ((hh - off) * 60 + mm) * 60000).toISOString();
}

/** openfootball → upsert fixtures + final results (reliable backbone). */
async function ingestOpenfootball(idx: Record<string, string>): Promise<number> {
  const res = await fetch(OPENFOOTBALL_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`openfootball ${res.status}`);
  const body: any = await res.json();
  const rows: any[] = [];
  for (const m of body.matches ?? []) {
    if (!/^Group [A-L]$/.test(m.group || '')) continue; // group stage only (knockouts are placeholders)
    const g = m.group.replace('Group ', '');
    const home = idx[norm(m.team1)];
    const away = idx[norm(m.team2)];
    if (!home || !away) continue;
    const ft = m.score?.ft;
    rows.push({
      id: `wc-${g}-${home}-${away}`,
      source: 'openfootball',
      stage: 'Group',
      group_code: g,
      home_team_id: home,
      away_team_id: away,
      kickoff: isoFromOf(m.date, m.time),
      venue: m.ground,
      city: m.ground,
      status: ft ? 'finished' : 'scheduled',
      home_score: ft ? ft[0] : null,
      away_score: ft ? ft[1] : null,
      last_updated: new Date().toISOString(),
    });
  }
  if (rows.length && dbWrite) {
    // Don't clobber a match currently marked live by the worldcup26 overlay.
    const { data: liveRows } = await db.from('matches').select('id').eq('status', 'live');
    const liveIds = new Set((liveRows ?? []).map((r) => r.id));
    const upsertable = rows.filter((r) => !liveIds.has(r.id));
    const { error } = await dbWrite.from('matches').upsert(upsertable, { onConflict: 'id' });
    if (error) throw error;
    return upsertable.length;
  }
  return 0;
}

/** worldcup26.ir → overlay live status/score (best-effort, never throws upward). */
async function ingestWorldcup26Live(idx: Record<string, string>): Promise<number> {
  try {
    const res = await fetch(WORLDCUP26_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return 0;
    const body: any = await res.json();
    const games: any[] = Array.isArray(body) ? body : body.data ?? body.games ?? body.results ?? [];
    let n = 0;
    for (const game of games) {
      const blob = JSON.stringify(game).toLowerCase();
      const isLive = /live|playing|in.?progress|first.?half|second.?half|half.?time/.test(blob);
      if (!isLive) continue;
      const home = idx[norm(game.team1 ?? game.home ?? game.home_team ?? '')];
      const away = idx[norm(game.team2 ?? game.away ?? game.away_team ?? '')];
      if (!home || !away || !dbWrite) continue;
      const hs = Number(game.score1 ?? game.home_score ?? game.homeScore);
      const as = Number(game.score2 ?? game.away_score ?? game.awayScore);
      const minute = Number(String(game.minute ?? game.time ?? '').match(/\d+/)?.[0] ?? '') || null;
      const { error } = await dbWrite
        .from('matches')
        .update({ status: 'live', home_score: Number.isFinite(hs) ? hs : null, away_score: Number.isFinite(as) ? as : null, minute, source: 'worldcup26', last_updated: new Date().toISOString() })
        .or(`and(home_team_id.eq.${home},away_team_id.eq.${away})`);
      if (!error) n++;
    }
    return n;
  } catch {
    return 0; // source down → keep last good data
  }
}

export async function runIngestion(): Promise<{ ok: boolean; upserted: number; live: number; note?: string }> {
  if (!hasWriteAccess() || !dbWrite) {
    return { ok: false, upserted: 0, live: 0, note: 'ingestion disabled: set SUPABASE_SERVICE_ROLE_KEY to enable provider writes' };
  }
  const startedAt = new Date().toISOString();
  try {
    const idx = await teamIndex();
    const upserted = await ingestOpenfootball(idx);
    const live = await ingestWorldcup26Live(idx);
    await dbWrite.from('ingestion_runs').insert({ source: 'openfootball+worldcup26', status: 'ok', matches_upserted: upserted + live, started_at: startedAt, finished_at: new Date().toISOString() });
    return { ok: true, upserted, live };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    await dbWrite.from('ingestion_runs').insert({ source: 'openfootball+worldcup26', status: 'error', error: message, started_at: startedAt, finished_at: new Date().toISOString() });
    return { ok: false, upserted: 0, live: 0, note: message };
  }
}

/** Is any match in its live window now? Gates frequent live polling. */
async function inLiveWindow(): Promise<boolean> {
  const now = Date.now();
  const { data } = await db.from('matches').select('kickoff').gte('kickoff', new Date(now - LIVE_WINDOW_MS).toISOString()).lte('kickoff', new Date(now).toISOString());
  return (data ?? []).length > 0;
}

let baseTimer: NodeJS.Timeout | null = null;
let liveTimer: NodeJS.Timeout | null = null;

export function startScheduler(log: (msg: string) => void) {
  if (!config.ingestEnabled) return log('ingestion off (INGEST_ENABLED=false)');
  if (!hasWriteAccess()) return log('ingestion idle: no SUPABASE_SERVICE_ROLE_KEY (reads still serve real seeded data)');

  // openfootball backbone: refresh every few hours (it updates ~daily).
  const base = async () => {
    const r = await runIngestion();
    log(`ingest(base): ${r.ok ? `ok, ${r.upserted} fixtures, ${r.live} live` : `skipped (${r.note})`}`);
  };
  void base();
  baseTimer = setInterval(base, 6 * 60 * 60 * 1000);

  // worldcup26 live overlay: only during match windows, every INGEST_INTERVAL_SEC.
  const liveTick = async () => {
    if (!(await inLiveWindow())) return;
    const idx = await teamIndex();
    const n = await ingestWorldcup26Live(idx);
    if (n) log(`ingest(live): ${n} updated`);
  };
  liveTimer = setInterval(liveTick, Math.max(60, config.ingestIntervalSec) * 1000);
}

export function stopScheduler() {
  if (baseTimer) clearInterval(baseTimer);
  if (liveTimer) clearInterval(liveTimer);
}

if (process.argv.includes('--once')) {
  runIngestion().then((r) => { console.log(JSON.stringify(r)); process.exit(0); });
}
