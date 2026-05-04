import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import { sql } from 'drizzle-orm';

const dbUrl = "postgresql://postgres:Welovepurple12%3F@db.eosghccvgazzqoazbnjd.supabase.co:5432/postgres";
const client = postgres(dbUrl, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log('Counting duplicates...');
  const dupes = await db.execute(sql`
    SELECT user_id, spotify_track_id, played_at, count(*) 
    FROM listening_events 
    GROUP BY user_id, spotify_track_id, played_at 
    HAVING count(*) > 1
  `);
  console.log('Duplicate sets found:', dupes.length);

  if (dupes.length > 0) {
    console.log('Cleaning up duplicates...');
    await db.execute(sql`
      DELETE FROM listening_events a USING (
        SELECT MIN(ctid) as keepid, user_id, spotify_track_id, played_at
        FROM listening_events
        GROUP BY user_id, spotify_track_id, played_at
        HAVING count(*) > 1
      ) b
      WHERE a.user_id = b.user_id 
        AND a.spotify_track_id = b.spotify_track_id 
        AND a.played_at = b.played_at
        AND a.ctid <> b.keepid
    `);
    console.log('Cleanup complete.');
  }

  console.log('Applying unique constraint...');
  try {
    await db.execute(sql`
      ALTER TABLE listening_events 
      ADD CONSTRAINT unique_user_track_played 
      UNIQUE (user_id, spotify_track_id, played_at)
    `);
    console.log('Unique constraint applied successfully.');
  } catch (e) {
    console.error('Failed to apply constraint:', e);
  }

  process.exit(0);
}
main();
