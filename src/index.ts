import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { Bindings, Variables } from './types';
import { auth } from './routes/auth';
import { sync } from './routes/sync';
import { stats } from './routes/stats';
import { runAggregation } from './crons/aggregate';
import { runArchiving } from './crons/archive';
import { syncAllUsers } from './crons/syncAll';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get('/db-fix', async (c) => {
  const { getDb } = await import('./db');
  const { sql } = await import('drizzle-orm');
  const db = getDb(c.env.DATABASE_URL);
  const results: string[] = [];
  try {
    // Add image_url to tracks / artists (legacy — already exists on most deployments)
    await db.execute(sql`ALTER TABLE tracks ADD COLUMN IF NOT EXISTS image_url text;`);
    results.push('tracks.image_url ok');
    await db.execute(sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS image_url text;`);
    results.push('artists.image_url ok');

    // Add processed column to listening_events (was missing from initial migration)
    await db.execute(sql`ALTER TABLE listening_events ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false;`);
    results.push('listening_events.processed ok');

    // Backfill: mark all existing rows as processed so aggregation doesn't re-process them
    await db.execute(sql`UPDATE listening_events SET processed = true WHERE processed IS NULL;`);
    results.push('backfill processed ok');

    // Add unique constraint to prevent duplicate event insertion on re-sync
    await db.execute(sql`
      ALTER TABLE listening_events
      ADD CONSTRAINT IF NOT EXISTS unique_user_track_played
      UNIQUE (user_id, spotify_track_id, played_at);
    `);
    results.push('unique constraint ok');

    return c.json({ ok: true, results });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message, results });
  }
});

app.use('*', cors());

app.route('/auth', auth);

// Protect all other routes with JWT
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

app.get('/', (c) => c.text('Music Stats API is running'));

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
