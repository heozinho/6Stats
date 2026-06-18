import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { Bindings, Variables } from './types';
import { auth } from './routes/auth';
import { sync } from './routes/sync';
import { stats } from './routes/stats';
import { playlists } from './routes/playlists';
import { runArchiving } from './crons/archive';
import { syncAllUsers } from './crons/syncAll';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get('/db-fix-mood', async (c) => {
  const { getDb } = await import('./db');
  const { sql } = await import('drizzle-orm');
  const db = getDb(c.env.DATABASE_URL);
  try {
    await db.execute(sql`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS valence integer;`);
    await db.execute(sql`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS energy integer;`);
    await db.execute(sql`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS danceability integer;`);
    await db.execute(sql`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS acousticness integer;`);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message });
  }
});

app.use('*', cors());

app.route('/auth', auth);

// Protect sync routes
app.use('/sync/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  });
  return jwtMiddleware(c, next);
});
app.use('/sync/*', async (c, next) => {
  const payload = c.get('jwtPayload');
  c.set('userId', payload.sub as string);
  await next();
});

// Protect stats routes
app.use('/stats/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  });
  return jwtMiddleware(c, next);
});
app.use('/stats/*', async (c, next) => {
  const payload = c.get('jwtPayload');
  c.set('userId', payload.sub as string);
  await next();
});

app.route('/sync', sync);
app.route('/stats', stats);
app.route('/playlists', playlists);

app.get('/', (c) => c.text('6Stats API is running'));

export default {
  fetch: app.fetch,
  
  // Cloudflare Scheduled Worker handler
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    if (event.cron === '0 0 * * *') { // Every midnight — sync all users + aggregate
      ctx.waitUntil(syncAllUsers(env));
    }
    if (event.cron === '0 2 * * 7') { // Every Sunday at 2 AM — archive old events
      ctx.waitUntil(runArchiving(env));
    }
  }
};
