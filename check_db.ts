import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';

const connectionString = 'postgresql://postgres:Welovepurple12%3F@db.eosghccvgazzqoazbnjd.supabase.co:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  console.log('\n=== TRACKS (first 5, checking imageUrl) ===');
  const tracks = await db.select({
    id: schema.tracks.spotifyTrackId,
    name: schema.tracks.name,
    imageUrl: schema.tracks.imageUrl,
  }).from(schema.tracks).limit(5);
  console.table(tracks);

  console.log('\n=== ARTISTS (first 5, checking imageUrl) ===');
  const artists = await db.select({
    id: schema.artists.spotifyArtistId,
    name: schema.artists.name,
    imageUrl: schema.artists.imageUrl,
  }).from(schema.artists).limit(5);
  console.table(artists);

  console.log('\n=== DAILY TRACK STATS (first 3) ===');
  const trackStats = await db.select().from(schema.dailyTrackStats).limit(3);
  console.table(trackStats);

  process.exit(0);
}

main().catch(console.error);
