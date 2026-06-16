/**
 * Seed SQL generator for the World Cup database.
 *
 * Emits idempotent UPSERT SQL for teams, venues, the full group-stage fixture
 * schedule (with deterministic simulated results for matches whose kickoff has
 * passed), today's marquee slate, and one fully-detailed showcase match
 * (lineups + players + events + per-player stats) for the formation view.
 *
 * Run:  node server/scripts/gen-seed.mjs > /tmp/wc_seed.sql
 *
 * This is the schedule/seed baseline. Live ingestion (ESPN / API-Football) then
 * overlays real status + scores on top of these rows.
 */

const TEAMS = [
  ['MEX','Mexico','🇲🇽','A',14,'CONCACAF',1845,true],['POL','Poland','🇵🇱','A',28,'UEFA',1800,false],['KSA','Saudi Arabia','🇸🇦','A',56,'AFC',1710,false],['NZL','New Zealand','🇳🇿','A',95,'OFC',1650,false],
  ['CAN','Canada','🇨🇦','B',31,'CONCACAF',1790,true],['BEL','Belgium','🇧🇪','B',8,'UEFA',1980,false],['KOR','South Korea','🇰🇷','B',23,'AFC',1810,false],['CIV','Ivory Coast','🇨🇮','B',40,'CAF',1785,false],
  ['USA','United States','🇺🇸','C',16,'CONCACAF',1860,true],['NED','Netherlands','🇳🇱','C',6,'UEFA',2010,false],['GHA','Ghana','🇬🇭','C',68,'CAF',1760,false],['QAT','Qatar','🇶🇦','C',51,'AFC',1700,false],
  ['ARG','Argentina','🇦🇷','D',1,'CONMEBOL',2090,false],['CRO','Croatia','🇭🇷','D',10,'UEFA',1960,false],['NGA','Nigeria','🇳🇬','D',44,'CAF',1795,false],['HON','Honduras','🇭🇳','D',70,'CONCACAF',1680,false],
  ['FRA','France','🇫🇷','E',2,'UEFA',2080,false],['JPN','Japan','🇯🇵','E',17,'AFC',1890,false],['SEN','Senegal','🇸🇳','E',19,'CAF',1855,false],['PAN','Panama','🇵🇦','E',41,'CONCACAF',1700,false],
  ['BRA','Brazil','🇧🇷','F',5,'CONMEBOL',2040,false],['SUI','Switzerland','🇨🇭','F',20,'UEFA',1900,false],['AUS','Australia','🇦🇺','F',24,'AFC',1800,false],['CMR','Cameroon','🇨🇲','F',53,'CAF',1770,false],
  ['ENG','England','🏴󠁧󠁢󠁥󠁮󠁧󠁿','G',4,'UEFA',2050,false],['URU','Uruguay','🇺🇾','G',11,'CONMEBOL',1950,false],['EGY','Egypt','🇪🇬','G',33,'CAF',1790,false],['CRC','Costa Rica','🇨🇷','G',54,'CONCACAF',1720,false],
  ['ESP','Spain','🇪🇸','H',3,'UEFA',2070,false],['MAR','Morocco','🇲🇦','H',13,'CAF',1920,false],['DEN','Denmark','🇩🇰','H',21,'UEFA',1850,false],['JAM','Jamaica','🇯🇲','H',55,'CONCACAF',1690,false],
  ['POR','Portugal','🇵🇹','I',7,'UEFA',2030,false],['COL','Colombia','🇨🇴','I',12,'CONMEBOL',1930,false],['TUN','Tunisia','🇹🇳','I',41,'CAF',1740,false],['UZB','Uzbekistan','🇺🇿','I',57,'AFC',1700,false],
  ['GER','Germany','🇩🇪','J',9,'UEFA',1975,false],['NOR','Norway','🇳🇴','J',18,'UEFA',1840,false],['ECU','Ecuador','🇪🇨','J',26,'CONMEBOL',1820,false],['ALG','Algeria','🇩🇿','J',38,'CAF',1775,false],
  ['ITA','Italy','🇮🇹','K',15,'UEFA',1955,false],['IRN','Iran','🇮🇷','K',22,'AFC',1780,false],['SCO','Scotland','🏴󠁧󠁢󠁳󠁣󠁴󠁿','K',36,'UEFA',1790,false],['PER','Peru','🇵🇪','K',35,'CONMEBOL',1740,false],
  ['AUT','Austria','🇦🇹','L',25,'UEFA',1815,false],['PAR','Paraguay','🇵🇾','L',49,'CONMEBOL',1730,false],['MLI','Mali','🇲🇱','L',48,'CAF',1720,false],['CPV','Cape Verde','🇨🇻','L',72,'CAF',1700,false],
];

const VENUES = [
  ['metlife','MetLife Stadium','New York / New Jersey','USA',82500],['sofi','SoFi Stadium','Inglewood, CA','USA',70000],
  ['att','AT&T Stadium','Dallas','USA',80000],['nrg','NRG Stadium','Houston','USA',72000],
  ['mercedes','Mercedes-Benz Stadium','Atlanta, GA','USA',71000],['linc','Lincoln Financial Field','Philadelphia','USA',69000],
  ['gillette','Gillette Stadium','Boston','USA',65000],['lumen','Lumen Field','Seattle, WA','USA',69000],
  ['levis',"Levi's Stadium",'San Francisco Bay','USA',68500],['hardrock','Hard Rock Stadium','Miami, FL','USA',65000],
  ['arrowhead','Arrowhead Stadium','Kansas City','USA',76000],['bmo','BMO Field','Toronto','Canada',45000],
  ['bcplace','BC Place','Vancouver','Canada',54000],['azteca','Estadio Azteca','Mexico City','Mexico',87000],
  ['akron','Estadio Akron','Guadalajara','Mexico',49000],['bbva','Estadio BBVA','Monterrey','Mexico',53000],
];

const ratingOf = Object.fromEntries(TEAMS.map((t) => [t[0], t[6]]));
const hostOf = Object.fromEntries(TEAMS.map((t) => [t[0], t[7]]));
const GROUPS = [...new Set(TEAMS.map((t) => t[3]))];

// --- deterministic model (mirror of lib/predict) ---
function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function expGoals(home, away) {
  const adv = (hostOf[home] ? 0.18 : 0) - (hostOf[away] ? 0.18 : 0);
  const edge = (ratingOf[home] - ratingOf[away]) * 0.0022 + adv;
  return [Math.max(0.2, Math.min(5, 1.32 * Math.exp(edge))), Math.max(0.2, Math.min(5, 1.32 * Math.exp(-edge)))];
}
function samplePoisson(lambda, r) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= r(); } while (p > L && k < 12); return k - 1; }
function simScore(home, away, seed) { const [lh, la] = expGoals(home, away); const r = rng(seed); return [samplePoisson(lh, r), samplePoisson(la, r)]; }

// --- schedule anchored to today (ET) ---
const ET = 'America/New_York';
const etDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const ET_MIDNIGHT_TODAY = Date.parse(`${etDate(new Date())}T04:00:00Z`);
const TOURNAMENT_START = ET_MIDNIGHT_TODAY - 5 * 86400000;
const NOW = Date.now();
const LIVE_MS = 110 * 60 * 1000;
const MD_PAIRS = { 1: [[0, 1], [2, 3]], 2: [[0, 2], [1, 3]], 3: [[0, 3], [1, 2]] };
const HOURS = [12, 15, 18, 21];

function statusFor(koMs) {
  if (NOW >= koMs + LIVE_MS) return ['finished', null];
  if (NOW >= koMs) return ['live', Math.min(90, Math.max(1, Math.round((NOW - koMs) / 60000)))];
  return ['scheduled', null];
}

const matches = [];
let gi = 0;
for (let md = 1; md <= 3; md++) {
  let idx = 0;
  for (const g of GROUPS) {
    const gt = TEAMS.filter((t) => t[3] === g).map((t) => t[0]);
    for (const [hi, ai] of MD_PAIRS[md]) {
      const home = gt[hi], away = gt[ai];
      const day = Math.floor(idx / 12);
      const hour = HOURS[idx % 4];
      const koMs = TOURNAMENT_START + ((md - 1) * 3 + day) * 86400000 + hour * 3600000;
      const v = VENUES[gi % VENUES.length];
      const id = `m${String(gi).padStart(3, '0')}`;
      const [status, minute] = statusFor(koMs);
      let hs = null, as = null;
      if (status === 'finished') { [hs, as] = simScore(home, away, id); }
      else if (status === 'live') { const [fh, fa] = simScore(home, away, id); const pr = Math.min(1, minute / 90); hs = Math.round(fh * pr); as = Math.round(fa * pr); }
      matches.push({ id, source: 'schedule', stage: 'Group', group_code: g, matchday: md, home_team_id: home, away_team_id: away, kickoff: new Date(koMs).toISOString(), venue: v[1], city: v[2], status, home_score: hs, away_score: as, minute, featured: false });
      idx++; gi++;
    }
  }
}

// today's marquee slate
const FEATURED = [
  ['today-1', 'ESP', 'CPV', 12, 'Mercedes-Benz Stadium', 'Atlanta, GA'],
  ['today-2', 'BEL', 'EGY', 15, 'Lumen Field', 'Seattle, WA'],
  ['today-3', 'KSA', 'URU', 18, 'Hard Rock Stadium', 'Miami, FL'],
  ['today-4', 'IRN', 'NZL', 21, 'SoFi Stadium', 'Inglewood, CA'],
];
for (const [id, home, away, hour, venue, city] of FEATURED) {
  const koMs = ET_MIDNIGHT_TODAY + hour * 3600000;
  const [status, minute] = statusFor(koMs);
  let hs = null, as = null;
  if (status === 'finished') { [hs, as] = simScore(home, away, id); }
  else if (status === 'live') { const [fh, fa] = simScore(home, away, id); const pr = Math.min(1, minute / 90); hs = Math.round(fh * pr); as = Math.round(fa * pr); }
  matches.push({ id, source: 'schedule', stage: 'Group', group_code: null, matchday: null, home_team_id: home, away_team_id: away, kickoff: new Date(koMs).toISOString(), venue, city, status, home_score: hs, away_score: as, minute, featured: true });
}

// --- showcase lineups/players/events for today-1 (Spain v Cape Verde) ---
const FORMATION_433 = [
  ['GK', 0.5, 0.06], ['DF', 0.84, 0.24], ['DF', 0.62, 0.16], ['DF', 0.38, 0.16], ['DF', 0.16, 0.24],
  ['MF', 0.5, 0.42], ['MF', 0.72, 0.52], ['MF', 0.28, 0.52], ['FW', 0.82, 0.8], ['FW', 0.5, 0.88], ['FW', 0.18, 0.8],
];
const ESP_XI = [['Unai Simón', 1], ['Dani Carvajal', 2], ['Robin Le Normand', 4], ['Aymeric Laporte', 14], ['Marc Cucurella', 24], ['Rodri', 16], ['Pedri', 8], ['Fabián Ruiz', 12], ['Lamine Yamal', 19], ['Álvaro Morata', 7], ['Nico Williams', 17]];
const CPV_XI = [['Vozinha', 1], ['Stopira', 3], ['Roberto Lopes', 4], ['Diney', 5], ['Logan Costa', 2], ['Jamiro Monteiro', 6], ['Kevin Pina', 8], ['Deroy Duarte', 10], ['Ryan Mendes', 7], ['Garry Rodrigues', 11], ['Bebé', 9]];

const players = [];
const lineups = [];
const lineupPlayers = [];
const events = [];
const pstats = [];

function buildLineup(matchId, teamId, roster, formation) {
  const lid = `${matchId}:${teamId}`;
  lineups.push([lid, matchId, teamId, formation]);
  roster.forEach(([name, num], i) => {
    const pid = `${teamId}-${num}`;
    players.push([pid, teamId, name, FORMATION_433[i][0], num]);
    lineupPlayers.push([lid, pid, FORMATION_433[i][0], FORMATION_433[i][1], FORMATION_433[i][2], true]);
  });
}
buildLineup('today-1', 'ESP', ESP_XI, '4-3-3');
buildLineup('today-1', 'CPV', CPV_XI, '4-3-3');

// a few events + player stats for the showcase
events.push(['today-1-e1', 'today-1', 12, 'goal', 'ESP', 'ESP-19', 'Lamine Yamal']);
events.push(['today-1-e2', 'today-1', 34, 'goal', 'ESP', 'ESP-7', 'Álvaro Morata (assist: Pedri)']);
events.push(['today-1-e3', 'today-1', 51, 'yellow', 'CPV', 'CPV-6', 'Jamiro Monteiro']);
events.push(['today-1-e4', 'today-1', 63, 'goal', 'CPV', 'CPV-7', 'Ryan Mendes']);
events.push(['today-1-e5', 'today-1', 78, 'goal', 'ESP', 'ESP-17', 'Nico Williams']);
pstats.push(['today-1', 'ESP-19', 'ESP', 1, 1, 90, 8.4]);
pstats.push(['today-1', 'ESP-7', 'ESP', 1, 0, 84, 7.9]);
pstats.push(['today-1', 'ESP-8', 'ESP', 0, 1, 90, 8.1]);
pstats.push(['today-1', 'ESP-17', 'ESP', 1, 0, 90, 8.6]);
pstats.push(['today-1', 'CPV-7', 'CPV', 1, 0, 90, 7.7]);

// ---------- emit SQL ----------
const q = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined ? 'null' : v);
const out = [];

out.push('-- teams');
out.push('insert into teams (id,name,flag,group_code,fifa_rank,confederation,rating,host) values');
out.push(TEAMS.map((t) => `(${q(t[0])},${q(t[1])},${q(t[2])},${q(t[3])},${t[4]},${q(t[5])},${t[6]},${t[7]})`).join(',\n') +
  '\non conflict (id) do update set name=excluded.name,flag=excluded.flag,group_code=excluded.group_code,fifa_rank=excluded.fifa_rank,confederation=excluded.confederation,rating=excluded.rating,host=excluded.host;');

out.push('-- venues');
out.push('insert into venues (id,name,city,country,capacity) values');
out.push(VENUES.map((v) => `(${q(v[0])},${q(v[1])},${q(v[2])},${q(v[3])},${v[4]})`).join(',\n') +
  '\non conflict (id) do nothing;');

out.push('-- matches');
out.push('insert into matches (id,source,stage,group_code,matchday,home_team_id,away_team_id,kickoff,venue,city,status,home_score,away_score,minute,featured) values');
out.push(matches.map((m) => `(${q(m.id)},${q(m.source)},${q(m.stage)},${q(m.group_code)},${n(m.matchday)},${q(m.home_team_id)},${q(m.away_team_id)},${q(m.kickoff)},${q(m.venue)},${q(m.city)},${q(m.status)},${n(m.home_score)},${n(m.away_score)},${n(m.minute)},${m.featured})`).join(',\n') +
  `\non conflict (id) do update set status=excluded.status,home_score=excluded.home_score,away_score=excluded.away_score,minute=excluded.minute,kickoff=excluded.kickoff,last_updated=now();`);

out.push('-- players');
out.push('insert into players (id,team_id,name,position,shirt_number) values');
out.push(players.map((p) => `(${q(p[0])},${q(p[1])},${q(p[2])},${q(p[3])},${p[4]})`).join(',\n') + '\non conflict (id) do update set name=excluded.name,position=excluded.position,shirt_number=excluded.shirt_number;');

out.push('-- lineups');
out.push('insert into lineups (id,match_id,team_id,formation) values');
out.push(lineups.map((l) => `(${q(l[0])},${q(l[1])},${q(l[2])},${q(l[3])})`).join(',\n') + '\non conflict (id) do update set formation=excluded.formation;');

out.push('-- lineup_players (reset then insert)');
out.push(`delete from lineup_players where lineup_id in (${[...new Set(lineupPlayers.map((lp) => q(lp[0])))].join(',')});`);
out.push('insert into lineup_players (lineup_id,player_id,position,grid_x,grid_y,is_starter) values');
out.push(lineupPlayers.map((lp) => `(${q(lp[0])},${q(lp[1])},${q(lp[2])},${lp[3]},${lp[4]},${lp[5]})`).join(',\n') + ';');

out.push('-- match_events');
out.push('insert into match_events (id,match_id,minute,type,team_id,player_id,detail) values');
out.push(events.map((e) => `(${q(e[0])},${q(e[1])},${e[2]},${q(e[3])},${q(e[4])},${q(e[5])},${q(e[6])})`).join(',\n') + '\non conflict (id) do nothing;');

out.push('-- player_match_stats');
out.push('insert into player_match_stats (match_id,player_id,team_id,goals,assists,minutes,rating) values');
out.push(pstats.map((s) => `(${q(s[0])},${q(s[1])},${q(s[2])},${s[3]},${s[4]},${s[5]},${s[6]})`).join(',\n') + '\non conflict (match_id,player_id) do update set goals=excluded.goals,assists=excluded.assists,minutes=excluded.minutes,rating=excluded.rating;');

process.stdout.write(out.join('\n') + '\n');
