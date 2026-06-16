/**
 * World Cup Central — backend API + ingestion service.
 *
 * Serves normalized data from Postgres to the app and runs the ingestion
 * scheduler. Designed to scale: user reads hit the DB/cache, provider polling is
 * decoupled on a timer.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { getGroups, getMatch, getMatchDetail, getMatches, getStandings, getTeams, getTopScorers } from './repo.js';
import { runIngestion, startScheduler } from './ingest.js';
import { answer } from './ai.js';

const app = Fastify({ logger: { level: 'info' } });
await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true, service: 'worldcup-backend', time: new Date().toISOString() }));

app.get('/api/teams', async () => ({ data: await getTeams() }));
app.get('/api/groups', async () => ({ data: await getGroups() }));
app.get('/api/matches', async () => ({ data: await getMatches() }));
app.get('/api/scorers', async () => ({ data: await getTopScorers() }));

app.get('/api/matches/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const m = await getMatch(id);
  return m ? { data: m } : reply.code(404).send({ error: 'match not found' });
});

app.get('/api/matches/:id/detail', async (req, reply) => {
  const { id } = req.params as { id: string };
  const d = await getMatchDetail(id);
  return d ? { data: d } : reply.code(404).send({ error: 'match not found' });
});

app.get('/api/standings/:group', async (req) => {
  const { group } = req.params as { group: string };
  return { data: await getStandings(group) };
});

app.post('/api/ai/chat', async (req) => {
  const body = (req.body ?? {}) as { messages?: { role: string; content: string }[] };
  return answer(body.messages ?? []);
});

// Manual ingestion trigger (handy for testing; protect/remove in production).
app.post('/api/ingest/run', async () => runIngestion());

const start = async () => {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`worldcup-backend on :${config.port}`);
    startScheduler((msg) => app.log.info(msg));
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
