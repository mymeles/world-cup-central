/**
 * Real 2026 World Cup ingest → SQL, from openfootball (public-domain).
 * Replaces all seeded fixtures/teams with the REAL tournament: real 48 teams,
 * real groups, real group-stage fixtures + results, and real goalscorers.
 *
 *   node server/scripts/gen-real-seed.mjs > /tmp/real.sql   (reads /tmp/of2026.json)
 *
 * openfootball provides final results (not in-play); worldcup26.ir overlays live
 * status separately. No lineups/formations (no free source for 2026).
 */
import { readFileSync } from 'node:fs';

// Real 48: name -> [code, flag, group, rating, host]
const T = {
  'Mexico': ['MEX', '🇲🇽', 'A', 1845, true], 'South Africa': ['RSA', '🇿🇦', 'A', 1730, false], 'South Korea': ['KOR', '🇰🇷', 'A', 1810, false], 'Czech Republic': ['CZE', '🇨🇿', 'A', 1820, false],
  'Canada': ['CAN', '🇨🇦', 'B', 1790, true], 'Bosnia & Herzegovina': ['BIH', '🇧🇦', 'B', 1760, false], 'Qatar': ['QAT', '🇶🇦', 'B', 1700, false], 'Switzerland': ['SUI', '🇨🇭', 'B', 1900, false],
  'Brazil': ['BRA', '🇧🇷', 'C', 2040, false], 'Morocco': ['MAR', '🇲🇦', 'C', 1920, false], 'Haiti': ['HAI', '🇭🇹', 'C', 1620, false], 'Scotland': ['SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C', 1790, false],
  'USA': ['USA', '🇺🇸', 'D', 1860, true], 'Paraguay': ['PAR', '🇵🇾', 'D', 1730, false], 'Australia': ['AUS', '🇦🇺', 'D', 1800, false], 'Turkey': ['TUR', '🇹🇷', 'D', 1850, false],
  'Germany': ['GER', '🇩🇪', 'E', 1975, false], 'Curaçao': ['CUW', '🇨🇼', 'E', 1640, false], 'Ivory Coast': ['CIV', '🇨🇮', 'E', 1785, false], 'Ecuador': ['ECU', '🇪🇨', 'E', 1820, false],
  'Netherlands': ['NED', '🇳🇱', 'F', 2010, false], 'Japan': ['JPN', '🇯🇵', 'F', 1890, false], 'Sweden': ['SWE', '🇸🇪', 'F', 1830, false], 'Tunisia': ['TUN', '🇹🇳', 'F', 1740, false],
  'Belgium': ['BEL', '🇧🇪', 'G', 1980, false], 'Egypt': ['EGY', '🇪🇬', 'G', 1790, false], 'Iran': ['IRN', '🇮🇷', 'G', 1780, false], 'New Zealand': ['NZL', '🇳🇿', 'G', 1650, false],
  'Spain': ['ESP', '🇪🇸', 'H', 2070, false], 'Cape Verde': ['CPV', '🇨🇻', 'H', 1700, false], 'Saudi Arabia': ['KSA', '🇸🇦', 'H', 1710, false], 'Uruguay': ['URU', '🇺🇾', 'H', 1950, false],
  'France': ['FRA', '🇫🇷', 'I', 2080, false], 'Senegal': ['SEN', '🇸🇳', 'I', 1855, false], 'Iraq': ['IRQ', '🇮🇶', 'I', 1700, false], 'Norway': ['NOR', '🇳🇴', 'I', 1840, false],
  'Argentina': ['ARG', '🇦🇷', 'J', 2090, false], 'Algeria': ['ALG', '🇩🇿', 'J', 1775, false], 'Austria': ['AUT', '🇦🇹', 'J', 1815, false], 'Jordan': ['JOR', '🇯🇴', 'J', 1660, false],
  'Portugal': ['POR', '🇵🇹', 'K', 2030, false], 'DR Congo': ['COD', '🇨🇩', 'K', 1740, false], 'Uzbekistan': ['UZB', '🇺🇿', 'K', 1700, false], 'Colombia': ['COL', '🇨🇴', 'K', 1930, false],
  'England': ['ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L', 2050, false], 'Croatia': ['CRO', '🇭🇷', 'L', 1960, false], 'Ghana': ['GHA', '🇬🇭', 'L', 1760, false], 'Panama': ['PAN', '🇵🇦', 'L', 1700, false],
};

const code = (name) => T[name]?.[0];
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

function toIso(date, time) {
  // time like "13:00 UTC-6"
  const m = String(time || '').match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  const hh = m ? +m[1] : 12, mm = m ? +m[2] : 0, off = m ? +m[3] : 0;
  const utcH = hh - off; // local = utc + off  =>  utc = local - off
  return new Date(`${date}T00:00:00Z`).getTime() + (utcH * 60 + mm) * 60000;
}

const data = JSON.parse(readFileSync('/tmp/of2026.json', 'utf8'));
const gs = data.matches.filter((m) => /^Group [A-L]$/.test(m.group || ''));

const matches = [];
const players = new Map(); // id -> [code, name, team]
const pstats = new Map(); // `${matchId}:${pid}` -> goals
const events = [];

for (const m of gs) {
  const g = m.group.replace('Group ', '');
  const h = code(m.team1), a = code(m.team2);
  if (!h || !a) continue;
  const id = `wc-${g}-${h}-${a}`;
  const ft = m.score?.ft;
  const status = ft ? 'finished' : 'scheduled';
  matches.push({
    id, group: g, homeId: h, awayId: a,
    kickoff: new Date(toIso(m.date, m.time)).toISOString(),
    venue: m.ground, city: m.ground,
    status, homeScore: ft ? ft[0] : null, awayScore: ft ? ft[1] : null,
    matchday: /Matchday (\d)/.exec(m.round)?.[1] ?? null,
  });
  const addGoals = (arr, teamCode) => {
    for (const goal of arr || []) {
      const pid = `${teamCode}-${goal.name.replace(/[^a-zA-Z]/g, '').slice(0, 16)}`;
      players.set(pid, [pid, goal.name, teamCode]);
      const key = `${id}:${pid}`;
      pstats.set(key, (pstats.get(key) || 0) + 1);
      events.push([`${id}-${events.length}`, id, parseInt(goal.minute) || null, 'goal', teamCode, pid, `${goal.name} ${goal.minute}'`]);
    }
  };
  addGoals(m.goals1, h);
  addGoals(m.goals2, a);
}

const out = [];
const realCodes = Object.values(T).map((v) => `'${v[0]}'`).join(',');

out.push('-- real teams (replace seed)');
out.push('insert into teams (id,name,flag,group_code,rating,host) values');
out.push(Object.entries(T).map(([name, v]) => `(${q(v[0])},${q(name)},${q(v[1])},${q(v[2])},${v[3]},${v[4]})`).join(',\n') +
  '\non conflict (id) do update set name=excluded.name,flag=excluded.flag,group_code=excluded.group_code,rating=excluded.rating,host=excluded.host;');

out.push('-- drop everything not in the real tournament');
out.push('delete from matches;');
out.push('delete from players;');
out.push(`delete from teams where id not in (${realCodes});`);

out.push('-- real fixtures + results');
out.push('insert into matches (id,source,stage,group_code,matchday,home_team_id,away_team_id,kickoff,venue,city,status,home_score,away_score) values');
out.push(matches.map((m) => `(${q(m.id)},'openfootball','Group',${q(m.group)},${m.matchday},${q(m.homeId)},${q(m.awayId)},${q(m.kickoff)},${q(m.venue)},${q(m.city)},${q(m.status)},${m.homeScore == null ? 'null' : m.homeScore},${m.awayScore == null ? 'null' : m.awayScore})`).join(',\n') + ';');

out.push('-- goalscorers → players + per-match stats');
out.push('insert into players (id,team_id,name) values');
out.push([...players.values()].map((p) => `(${q(p[0])},${q(p[2])},${q(p[1])})`).join(',\n') + '\non conflict (id) do nothing;');

out.push('insert into player_match_stats (match_id,player_id,team_id,goals) values');
out.push([...pstats.entries()].map(([key, goals]) => { const [mid, pid] = key.split(':'); return `(${q(mid)},${q(pid)},${q(players.get(pid)[2])},${goals})`; }).join(',\n') +
  '\non conflict (match_id,player_id) do update set goals=excluded.goals;');

process.stderr.write(`teams:48 matches:${matches.length} players:${players.size} goals:${events.length}\n`);
process.stdout.write(out.join('\n') + '\n');
