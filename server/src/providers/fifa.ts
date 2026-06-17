/**
 * FIFA provider — the official source. api.fifa.com/api/v3 is undocumented but
 * public; it's authoritative for scores and starting lineups, so we use it to
 * corroborate ESPN and to fill gaps ESPN lacks. Best-effort + time-bounded.
 *
 * 2026 FIFA World Cup: competition 17, season 285023.
 */
const BASE = 'https://api.fifa.com/api/v3';
const COMPETITION = '17';
const SEASON = '285023';

export interface FifaMatch {
  idMatch: string;
  idStage: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'finished';
  minute: number | null;
  kickoff: string;
}

export interface FifaLineupPlayer {
  name: string;
  number: number | null;
  position: string | null;
  isStarter: boolean;
}

export interface FifaLineup {
  teamAbbr: string;
  formation: string | null;
  players: FifaLineupPlayer[];
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

function localized(field: unknown): string {
  if (Array.isArray(field)) {
    const en = field.find((x: any) => /^en/i.test(x?.Locale ?? '')) ?? field[0];
    return en?.Description ?? '';
  }
  return typeof field === 'string' ? field : '';
}

// FIFA MatchStatus: 0 = played/finished, 3 = live (1/8/12 = upcoming variants).
function mapStatus(raw: number, homeScore: number | null): FifaMatch['status'] {
  if (raw === 3) return 'live';
  if (raw === 0 && homeScore != null) return 'finished';
  return 'scheduled';
}

const POSITIONS: Record<number, string> = { 0: 'GK', 1: 'DEF', 2: 'MID', 3: 'FWD' };

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Full 2026 tournament calendar with official scores/status. */
export async function fetchFifaMatches(): Promise<FifaMatch[]> {
  const body = await getJson(`${BASE}/calendar/matches?idCompetition=${COMPETITION}&idSeason=${SEASON}&count=400&language=en`);
  const out: FifaMatch[] = [];
  for (const m of body?.Results ?? []) {
    const home = m?.Home ?? {};
    const away = m?.Away ?? {};
    const homeScore = num(home?.Score);
    const awayScore = num(away?.Score);
    out.push({
      idMatch: String(m?.IdMatch ?? ''),
      idStage: String(m?.IdStage ?? ''),
      homeAbbr: home?.Abbreviation ?? '',
      awayAbbr: away?.Abbreviation ?? '',
      homeName: localized(home?.TeamName),
      awayName: localized(away?.TeamName),
      homeScore,
      awayScore,
      status: mapStatus(Number(m?.MatchStatus), homeScore),
      minute: num(String(m?.MatchTime ?? '').match(/\d+/)?.[0]),
      kickoff: m?.Date ?? '',
    });
  }
  return out;
}

/** Official lineups for one match (starters + subs, formation when present). */
export async function fetchFifaLineups(idStage: string, idMatch: string): Promise<FifaLineup[]> {
  const body = await getJson(`${BASE}/live/football/${COMPETITION}/${SEASON}/${idStage}/${idMatch}?language=en`);
  if (!body) return [];
  const out: FifaLineup[] = [];
  for (const side of ['HomeTeam', 'AwayTeam'] as const) {
    const t = body?.[side];
    if (!t) continue;
    const players: FifaLineupPlayer[] = (t?.Players ?? []).map((p: any) => ({
      name: localized(p?.PlayerName) || p?.ShortName || 'Unknown',
      number: num(p?.ShirtNumber),
      position: POSITIONS[Number(p?.Position)] ?? null,
      isStarter: Number(p?.Status) === 1,
    }));
    const starters = players.filter((p) => p.isStarter);
    if (starters.length) {
      out.push({
        teamAbbr: t?.Abbreviation ?? t?.IdTeam ?? '',
        formation: t?.Formation ?? t?.TacticalFormation ?? null,
        players,
      });
    }
  }
  return out;
}
