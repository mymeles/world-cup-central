/**
 * Seed dataset for the 2026 FIFA World Cup (USA · Canada · Mexico).
 *
 * Team groupings, ratings and fixtures here are schedule-only fallback data used
 * when a live provider is not configured. Scores and match status must come from
 * `app/api/data+api.ts`.
 */

import type { Match, Scorer, Team, Venue } from '../types';

/**
 * "Today" is the real current date in US Eastern (the tournament's host
 * timezone). Seed fixtures are schedule-only; scores and live/final status must
 * come from a live provider.
 */
const ET = 'America/New_York';
const etDate = (d: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

// Midnight (00:00 ET) of today as a UTC instant. In June, ET = UTC-4 (EDT).
const ET_MIDNIGHT_TODAY = Date.parse(`${etDate(new Date())}T04:00:00Z`);

/** Snapshot used for relative day labels. */
export const NOW = new Date();

export const TEAMS: Team[] = [
  // Group A
  { id: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'A', rank: 14, confederation: 'CONCACAF', rating: 1845, host: true },
  { id: 'POL', name: 'Poland', flag: '🇵🇱', group: 'A', rank: 28, confederation: 'UEFA', rating: 1800 },
  { id: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'A', rank: 56, confederation: 'AFC', rating: 1710 },
  { id: 'NZL', name: 'New Zealand', flag: '🇳🇿', group: 'A', rank: 95, confederation: 'OFC', rating: 1650 },
  // Group B
  { id: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'B', rank: 31, confederation: 'CONCACAF', rating: 1790, host: true },
  { id: 'BEL', name: 'Belgium', flag: '🇧🇪', group: 'B', rank: 8, confederation: 'UEFA', rating: 1980 },
  { id: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'B', rank: 23, confederation: 'AFC', rating: 1810 },
  { id: 'CIV', name: 'Ivory Coast', flag: '🇨🇮', group: 'B', rank: 40, confederation: 'CAF', rating: 1785 },
  // Group C
  { id: 'USA', name: 'United States', flag: '🇺🇸', group: 'C', rank: 16, confederation: 'CONCACAF', rating: 1860, host: true },
  { id: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'C', rank: 6, confederation: 'UEFA', rating: 2010 },
  { id: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'C', rank: 68, confederation: 'CAF', rating: 1760 },
  { id: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'C', rank: 51, confederation: 'AFC', rating: 1700 },
  // Group D
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'D', rank: 1, confederation: 'CONMEBOL', rating: 2090 },
  { id: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'D', rank: 10, confederation: 'UEFA', rating: 1960 },
  { id: 'NGA', name: 'Nigeria', flag: '🇳🇬', group: 'D', rank: 44, confederation: 'CAF', rating: 1795 },
  { id: 'HON', name: 'Honduras', flag: '🇭🇳', group: 'D', rank: 70, confederation: 'CONCACAF', rating: 1680 },
  // Group E
  { id: 'FRA', name: 'France', flag: '🇫🇷', group: 'E', rank: 2, confederation: 'UEFA', rating: 2080 },
  { id: 'JPN', name: 'Japan', flag: '🇯🇵', group: 'E', rank: 17, confederation: 'AFC', rating: 1890 },
  { id: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'E', rank: 19, confederation: 'CAF', rating: 1855 },
  { id: 'PAN', name: 'Panama', flag: '🇵🇦', group: 'E', rank: 41, confederation: 'CONCACAF', rating: 1700 },
  // Group F
  { id: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'F', rank: 5, confederation: 'CONMEBOL', rating: 2040 },
  { id: 'SUI', name: 'Switzerland', flag: '🇨🇭', group: 'F', rank: 20, confederation: 'UEFA', rating: 1900 },
  { id: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'F', rank: 24, confederation: 'AFC', rating: 1800 },
  { id: 'CMR', name: 'Cameroon', flag: '🇨🇲', group: 'F', rank: 53, confederation: 'CAF', rating: 1770 },
  // Group G
  { id: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'G', rank: 4, confederation: 'UEFA', rating: 2050 },
  { id: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'G', rank: 11, confederation: 'CONMEBOL', rating: 1950 },
  { id: 'EGY', name: 'Egypt', flag: '🇪🇬', group: 'G', rank: 33, confederation: 'CAF', rating: 1790 },
  { id: 'CRC', name: 'Costa Rica', flag: '🇨🇷', group: 'G', rank: 54, confederation: 'CONCACAF', rating: 1720 },
  // Group H
  { id: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'H', rank: 3, confederation: 'UEFA', rating: 2070 },
  { id: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'H', rank: 13, confederation: 'CAF', rating: 1920 },
  { id: 'DEN', name: 'Denmark', flag: '🇩🇰', group: 'H', rank: 21, confederation: 'UEFA', rating: 1850 },
  { id: 'JAM', name: 'Jamaica', flag: '🇯🇲', group: 'H', rank: 55, confederation: 'CONCACAF', rating: 1690 },
  // Group I
  { id: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'I', rank: 7, confederation: 'UEFA', rating: 2030 },
  { id: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'I', rank: 12, confederation: 'CONMEBOL', rating: 1930 },
  { id: 'TUN', name: 'Tunisia', flag: '🇹🇳', group: 'I', rank: 41, confederation: 'CAF', rating: 1740 },
  { id: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', group: 'I', rank: 57, confederation: 'AFC', rating: 1700 },
  // Group J
  { id: 'GER', name: 'Germany', flag: '🇩🇪', group: 'J', rank: 9, confederation: 'UEFA', rating: 1975 },
  { id: 'NOR', name: 'Norway', flag: '🇳🇴', group: 'J', rank: 18, confederation: 'UEFA', rating: 1840 },
  { id: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'J', rank: 26, confederation: 'CONMEBOL', rating: 1820 },
  { id: 'ALG', name: 'Algeria', flag: '🇩🇿', group: 'J', rank: 38, confederation: 'CAF', rating: 1775 },
  // Group K
  { id: 'ITA', name: 'Italy', flag: '🇮🇹', group: 'K', rank: 15, confederation: 'UEFA', rating: 1955 },
  { id: 'IRN', name: 'Iran', flag: '🇮🇷', group: 'K', rank: 22, confederation: 'AFC', rating: 1780 },
  { id: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'K', rank: 36, confederation: 'UEFA', rating: 1790 },
  { id: 'PER', name: 'Peru', flag: '🇵🇪', group: 'K', rank: 35, confederation: 'CONMEBOL', rating: 1740 },
  // Group L
  { id: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'L', rank: 25, confederation: 'UEFA', rating: 1815 },
  { id: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'L', rank: 49, confederation: 'CONMEBOL', rating: 1730 },
  { id: 'MLI', name: 'Mali', flag: '🇲🇱', group: 'L', rank: 48, confederation: 'CAF', rating: 1720 },
  { id: 'CPV', name: 'Cape Verde', flag: '🇨🇻', group: 'L', rank: 72, confederation: 'CAF', rating: 1700 },
];

export const GROUPS = 'ABCDEFGHIJKL'.split('');

export const VENUES: Venue[] = [
  { id: 'metlife', name: 'MetLife Stadium', city: 'New York / New Jersey', country: 'USA', capacity: 82500 },
  { id: 'sofi', name: 'SoFi Stadium', city: 'Los Angeles', country: 'USA', capacity: 70000 },
  { id: 'att', name: 'AT&T Stadium', city: 'Dallas', country: 'USA', capacity: 80000 },
  { id: 'nrg', name: 'NRG Stadium', city: 'Houston', country: 'USA', capacity: 72000 },
  { id: 'mercedes', name: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA', capacity: 71000 },
  { id: 'linc', name: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA', capacity: 69000 },
  { id: 'gillette', name: 'Gillette Stadium', city: 'Boston', country: 'USA', capacity: 65000 },
  { id: 'lumen', name: 'Lumen Field', city: 'Seattle', country: 'USA', capacity: 69000 },
  { id: 'levis', name: "Levi's Stadium", city: 'San Francisco Bay', country: 'USA', capacity: 68500 },
  { id: 'hardrock', name: 'Hard Rock Stadium', city: 'Miami', country: 'USA', capacity: 65000 },
  { id: 'arrowhead', name: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA', capacity: 76000 },
  { id: 'bmo', name: 'BMO Field', city: 'Toronto', country: 'Canada', capacity: 45000 },
  { id: 'bcplace', name: 'BC Place', city: 'Vancouver', country: 'Canada', capacity: 54000 },
  { id: 'azteca', name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', capacity: 87000 },
  { id: 'akron', name: 'Estadio Akron', city: 'Guadalajara', country: 'Mexico', capacity: 49000 },
  { id: 'bbva', name: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico', capacity: 53000 },
];

const byId: Record<string, Team> = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

/**
 * Look up a seed team by id. Returns a neutral placeholder (rather than
 * `undefined`) for ids that only exist in live provider data, so callers reading
 * `.flag`/`.name`/`.rating` never crash.
 */
export const getTeam = (id: string): Team =>
  byId[id] ?? { id, name: id, flag: '🏳️', group: '', rank: 0, confederation: 'UEFA', rating: 1700 };

/** Round-robin pairings (by within-group index) for each of the three matchdays. */
const MD_PAIRS: Record<number, [number, number][]> = {
  1: [[0, 1], [2, 3]],
  2: [[0, 2], [1, 3]],
  3: [[0, 3], [1, 2]],
};

// Anchor the group stage around today: matchdays 1 & 2 sit in the recent past
// (finished), matchday 3 is upcoming, and the gap day (today) hosts the marquee
// slate. Kickoff hours are ET hours layered onto the ET-midnight anchor.
const TOURNAMENT_START = ET_MIDNIGHT_TODAY - 5 * 86400000;
const KICKOFF_HOURS = [12, 15, 18, 21]; // ET
function buildMatches(): Match[] {
  const out: Match[] = [];
  let globalIdx = 0;

  for (let md = 1 as 1 | 2 | 3; md <= 3; md++) {
    let idxInMd = 0;
    GROUPS.forEach((group, g) => {
      const groupTeams = TEAMS.filter((t) => t.group === group);
      for (const [hi, ai] of MD_PAIRS[md]) {
        const home = groupTeams[hi];
        const away = groupTeams[ai];

        // 12 matches per day, two days per matchday, with a one-day gap between
        // matchdays — leaving the gap day ("today") free for the marquee slate.
        const dayWithin = Math.floor(idxInMd / 12);
        const hour = KICKOFF_HOURS[idxInMd % KICKOFF_HOURS.length];
        const kickoffMs =
          TOURNAMENT_START + ((md - 1) * 3 + dayWithin) * 86400000 + hour * 3600000;

        const venue = VENUES[globalIdx % VENUES.length];
        out.push({
          id: `m${String(globalIdx).padStart(3, '0')}`,
          stage: 'Group',
          group,
          matchday: md,
          homeId: home.id,
          awayId: away.id,
          kickoff: new Date(kickoffMs).toISOString(),
          venue: venue.name,
          city: venue.city,
          status: 'scheduled',
        });
        idxInMd++;
        globalIdx++;
      }
    });
  }

  return out.sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
}

/**
 * Today's marquee slate — curated featured fixtures shown front-and-centre on the
 * home page, anchored to today's date with exact ET kickoff times and stadiums.
 */
const FEATURED_CONFIG = [
  { id: 'today-1', homeId: 'ESP', awayId: 'CPV', etHour: 12, venue: 'Mercedes-Benz Stadium', city: 'Atlanta, GA' },
  { id: 'today-2', homeId: 'BEL', awayId: 'EGY', etHour: 15, venue: 'Lumen Field', city: 'Seattle, WA' },
  { id: 'today-3', homeId: 'KSA', awayId: 'URU', etHour: 18, venue: 'Hard Rock Stadium', city: 'Miami, FL' },
  { id: 'today-4', homeId: 'IRN', awayId: 'NZL', etHour: 21, venue: 'SoFi Stadium', city: 'Inglewood, CA' },
] as const;

function buildFeatured(): Match[] {
  return FEATURED_CONFIG.map((c) => ({
    id: c.id,
    stage: 'Group' as const,
    featured: true,
    homeId: c.homeId,
    awayId: c.awayId,
    kickoff: new Date(ET_MIDNIGHT_TODAY + c.etHour * 3600000).toISOString(),
    venue: c.venue,
    city: c.city,
    status: 'scheduled' as const,
  }));
}

/** Structural fixtures. Live state is applied only by a live provider. */
const BASE_MATCHES: Match[] = [...buildMatches(), ...buildFeatured()].sort(
  (a, b) => +new Date(a.kickoff) - +new Date(b.kickoff),
);

/** All seed fixtures. These never include generated scores. */
export function currentMatches(): Match[] {
  return BASE_MATCHES.map((m) => ({ ...m, status: 'scheduled' }));
}

/** Illustrative tournament top scorers. */
export const TOP_SCORERS: Scorer[] = [
  { playerId: 'p1', name: 'Kylian Mbappé', teamId: 'FRA', goals: 5, assists: 2 },
  { playerId: 'p2', name: 'Julián Álvarez', teamId: 'ARG', goals: 4, assists: 3 },
  { playerId: 'p3', name: 'Erling Haaland', teamId: 'NOR', goals: 4, assists: 1 },
  { playerId: 'p4', name: 'Harry Kane', teamId: 'ENG', goals: 4, assists: 0 },
  { playerId: 'p5', name: 'Vinícius Júnior', teamId: 'BRA', goals: 3, assists: 4 },
  { playerId: 'p6', name: 'Lamine Yamal', teamId: 'ESP', goals: 3, assists: 3 },
  { playerId: 'p7', name: 'Cody Gakpo', teamId: 'NED', goals: 3, assists: 1 },
  { playerId: 'p8', name: 'Christian Pulisic', teamId: 'USA', goals: 3, assists: 1 },
  { playerId: 'p9', name: 'Achraf Hakimi', teamId: 'MAR', goals: 2, assists: 3 },
  { playerId: 'p10', name: 'Takefusa Kubo', teamId: 'JPN', goals: 2, assists: 2 },
];
