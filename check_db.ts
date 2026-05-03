import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import { sql } from 'drizzle-orm';

const connectionString = 'postgresql://postgres:Welovepurple12%3F@db.eosghccvgazzqoazbnjd.supabase.co:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  const events = await db.select({ count: sql`count(*)` }).from(schema.listeningEvents);
  console.log('Listening Events Count:', events[0].count);

  const userStats = await db.select().from(schema.dailyUserStats);
  console.log('Daily User Stats:', userStats);

  const trackStats = await db.select().from(schema.dailyTrackStats);
  console.log('Daily Track Stats Count:', trackStats.length);

  const tokens = await db.select().from(schema.spotifyTokens);
  console.log('Tokens count:', tokens.length);
  
  if (tokens.length > 0) {
    const token = tokens[0].accessTokenEncrypted;
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    console.log('Spotify recently played response:', JSON.stringify(data).substring(0, 500));
  }

  process.exit(0);
}

main().catch(console.error);
