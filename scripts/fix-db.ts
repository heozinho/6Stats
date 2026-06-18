import { getDb } from '../src/db';
import { listeningEvents, dailyUserStats, dailyTrackStats, dailyArtistStats } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import { runAggregation } from '../src/crons/aggregate';
import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

const env = process.env as any;

async function fixDb() {
  const db = getDb(env.DATABASE_URL);
  
  console.log('1. Deduplicating listening_events...');
  // Delete duplicates keeping the one with the smallest id
  await db.execute(sql`
    DELETE FROM listening_events
    WHERE id NOT IN (
      SELECT min(id) FROM listening_events GROUP BY user_id, spotify_track_id, played_at
    )
  `);

  console.log('2. Wiping corrupted aggregation tables...');
  await db.delete(dailyUserStats);
  await db.delete(dailyTrackStats);
  await db.delete(dailyArtistStats);

  console.log('3. Resetting all events to unprocessed...');
  await db.execute(sql`UPDATE listening_events SET processed = false`);

  console.log('4. Re-running aggregation...');
  await runAggregation(env);

  console.log('Done!');
}

fixDb().then(() => process.exit(0)).catch(console.error);
