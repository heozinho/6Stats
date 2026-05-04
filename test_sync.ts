import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import { getValidSpotifyToken, getRecentlyPlayed } from './src/services/spotify';

const dbUrl = "postgresql://postgres:Welovepurple12%3F@db.eosghccvgazzqoazbnjd.supabase.co:5432/postgres";
const client = postgres(dbUrl, { max: 1 });
const db = drizzle(client, { schema });

const env = {
  SPOTIFY_CLIENT_ID: "9a1ca717d6b1408b933d3b01a6e97a37",
  SPOTIFY_CLIENT_SECRET: "ca4a6bed18004c20aed57954337527ae"
};

async function main() {
  console.log('Fetching users...');
  const users = await db.select().from(schema.users).limit(1);
  if (users.length === 0) {
    console.log('No users found.');
    process.exit(0);
  }
  
  const userId = users[0].id;
  console.log(`Testing sync for user: ${userId}`);

  try {
    const token = await getValidSpotifyToken(userId, db, env);
    console.log(`Got token (starts with): ${token.substring(0, 15)}...`);

    const recent = await getRecentlyPlayed(token, 5);
    console.log(`Got recently played: ${recent.items.length} items`);
    for (const item of recent.items) {
      console.log(` - ${item.track.name} by ${item.track.artists[0].name}`);
    }
  } catch (error) {
    console.error('SYNC ERROR:', error);
  }
  
  process.exit(0);
}

main();
