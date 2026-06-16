/**
 * One-off ESPN → SQL generator. Pulls the real World Cup schedule/results/live
 * status from ESPN's scoreboard and emits UPSERT SQL that REPLACES the seeded
 * fixtures with live provider data (source='ESPN'). Run, then apply the SQL.
 *
 *   node server/scripts/espn-ingest-sql.mjs > /tmp/espn.sql
 *
 * This is a bootstrap; the backend's scheduled ingestion keeps it fresh once a
 * service-role key is configured.
 */

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const RANGES = ['20260610-20260712', '20260713-20260720'];

const num = (v) => (v == null || v === '' ? 'null' : Number.parseInt(v, 10));
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

function statusFromState(state, completed) {
  if (state === 'post' || completed) return 'finished';
  if (state === 'in') return 'live';
  return 'scheduled';
}
function minuteFrom(clock) {
  const m = String(clock ?? '').match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}
function groupFrom(note) {
  const m = String(note ?? '').match(/Group\s+([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

const matches = [];
const teamGroup = {}; // id -> { name, group }

for (const range of RANGES) {
  const res = await fetch(`${ESPN}?dates=${range}&limit=400`, { headers: { Accept: 'application/json' } });
  if (!res.ok) continue;
  const body = await res.json();
  for (const ev of body.events ?? []) {
    const c = ev.competitions?.[0];
    if (!c) continue;
    const home = c.competitors?.find((x) => x.homeAway === 'home');
    const away = c.competitors?.find((x) => x.homeAway === 'away');
    const homeId = (home?.team?.abbreviation || '').toUpperCase();
    const awayId = (away?.team?.abbreviation || '').toUpperCase();
    const kickoff = c.date ?? ev.date;
    if (!homeId || !awayId || !kickoff) continue;

    const group = groupFrom(c.notes?.[0]?.headline ?? c.altGameNote);
    const status = statusFromState(c.status?.type?.state, c.status?.type?.completed);
    teamGroup[homeId] = { name: home.team.displayName, group: group ?? teamGroup[homeId]?.group ?? null };
    teamGroup[awayId] = { name: away.team.displayName, group: group ?? teamGroup[awayId]?.group ?? null };

    matches.push({
      id: `espn-${ev.id}`,
      group,
      homeId, awayId,
      kickoff: new Date(kickoff).toISOString(),
      venue: c.venue?.fullName ?? null,
      city: c.venue?.address?.city ?? null,
      status,
      homeScore: status === 'scheduled' ? null : num(home?.score),
      awayScore: status === 'scheduled' ? null : num(away?.score),
      minute: status === 'live' ? minuteFrom(c.status?.displayClock) : null,
    });
  }
}

const out = [];
// upsert teams referenced by ESPN (set real group; insert any newcomers)
out.push('insert into teams (id,name,flag,group_code,rating) values');
out.push(
  Object.entries(teamGroup)
    .map(([id, t]) => `(${q(id)},${q(t.name)},'',${q(t.group)},1500)`)
    .join(',\n') + '\non conflict (id) do update set group_code=excluded.group_code;',
);

// replace seeded fixtures with real ESPN data
out.push("delete from matches where source <> 'ESPN';");
out.push('insert into matches (id,source,stage,group_code,home_team_id,away_team_id,kickoff,venue,city,status,home_score,away_score,minute) values');
out.push(
  matches
    .map(
      (m) =>
        `(${q(m.id)},'ESPN','Group',${q(m.group)},${q(m.homeId)},${q(m.awayId)},${q(m.kickoff)},${q(m.venue)},${q(m.city)},${q(m.status)},${m.homeScore},${m.awayScore},${m.minute})`,
    )
    .join(',\n') +
    '\non conflict (id) do update set status=excluded.status,home_score=excluded.home_score,away_score=excluded.away_score,minute=excluded.minute,kickoff=excluded.kickoff,group_code=excluded.group_code,last_updated=now();',
);

process.stderr.write(`ESPN matches: ${matches.length}, teams referenced: ${Object.keys(teamGroup).length}\n`);
process.stdout.write(out.join('\n') + '\n');
