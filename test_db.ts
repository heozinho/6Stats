import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import { sql } from 'drizzle-orm';

const dbUrl = "postgresql://postgres:Welovepurple12%3F@db.eosghccvgazzqoazbnjd.supabase.co:5432/postgres";
const client = postgres(dbUrl, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log('Checking listening_events...');
  const events = await db.select({
      id: schema.listeningEvents.id,
      trackId: schema.listeningEvents.spotifyTrackId,
      playedAt: schema.listeningEvents.playedAt,
      processed: schema.listeningEvents.processed
  }).from(schema.listeningEvents).orderBy(sql`${schema.listeningEvents.playedAt} DESC`).limit(10);
  console.log(`Found ${events.length} events. Latest 10:`);
  console.table(events);

  console.log('Checking daily_user_stats...');
  const stats = await db.select().from(schema.dailyUserStats).orderBy(sql`${schema.dailyUserStats.date} DESC`).limit(10);
  console.log(`Found ${stats.length} stats. Latest 10:`);
  console.table(stats);
  process.exit(0);
}
main();
