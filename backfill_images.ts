import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import { isNull, eq } from 'drizzle-orm';

const connectionString = 'postgresql://postgres:Welovepurple12%3F@db.eosghccvgazzqoazbnjd.supabase.co:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

const SPOTIFY_CLIENT_ID = '9a1ca717d6b1408b933d3b01a6e97a37';
const SPOTIFY_CLIENT_SECRET = 'ca4a6bed18004c20aed57954337527ae';

async function chunkArr<T>(arr: T[], size: number): Promise<T[][]> {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function getFreshUserToken(): Promise<string> {
  const tokens = await db.select().from(schema.spotifyTokens).limit(1);
  if (!tokens.length) throw new Error('No token found in DB');
  const { refreshTokenEncrypted, userId } = tokens[0];

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshTokenEncrypted }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data: any = await res.json();
  return data.access_token;
}

async function main() {
  const token = await getFreshUserToken();
  const headers = { Authorization: `Bearer ${token}` };

  console.log('Fetching artists with missing imageUrl...');
  const artistsToFix = await db.select({
    spotifyArtistId: schema.artists.spotifyArtistId,
    name: schema.artists.name,
  }).from(schema.artists).where(isNull(schema.artists.imageUrl));

  console.log(`Found ${artistsToFix.length} artists to backfill`);

  let artistsUpdated = 0;
  for (const batch of await chunkArr(artistsToFix.map(a => a.spotifyArtistId), 50)) {
    const res = await fetch(`https://api.spotify.com/v1/artists?ids=${batch.join(',')}`, { headers });
    if (!res.ok) {
        console.error('Artists API error:', res.status, await res.text());
        // Try singular if batch fails
        for (const id of batch) {
            const sRes = await fetch(`https://api.spotify.com/v1/artists/${id}`, { headers });
            if (sRes.ok) {
                const sData: any = await sRes.json();
                const img = sData.images?.[0]?.url;
                if (img) {
                    await db.update(schema.artists).set({ imageUrl: img }).where(eq(schema.artists.spotifyArtistId, id));
                    artistsUpdated++;
                }
            }
        }
        continue;
    }
    const data: any = await res.json();
    for (const artist of data.artists ?? []) {
      const img = artist?.images?.[0]?.url;
      if (img) {
        await db.update(schema.artists)
          .set({ imageUrl: img })
          .where(eq(schema.artists.spotifyArtistId, artist.id));
        artistsUpdated++;
      }
    }
  }
  console.log(`✅ Updated ${artistsUpdated}/${artistsToFix.length} artists with profile photos`);

  process.exit(0);
}

main().catch(console.error);
