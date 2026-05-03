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

// Refresh user token (this we know works for recently-played)
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
  await db.update(schema.spotifyTokens)
    .set({ accessTokenEncrypted: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000) })
    .where(eq(schema.spotifyTokens.userId, userId));
  console.log('✅ User token refreshed');
  return data.access_token;
}

async function main() {
  const token = await getFreshUserToken();
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch recently-played which includes full album.images array
  // This endpoint is allowed by our scopes (user-read-recently-played)
  console.log('\nFetching recently played with full track data...');
  const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers });
  if (!res.ok) throw new Error(`recently-played failed: ${res.status} ${await res.text()}`);

  const data: any = await res.json();
  const items = data.items ?? [];
  console.log(`Got ${items.length} recent plays`);

  let tracksUpdated = 0;
  let artistsUpdated = 0;
  const artistIdsToFetch: string[] = [];

  for (const item of items) {
    const track = item.track;
    if (!track) continue;

    // Update track image from album.images (this IS included in recently-played)
    const albumImageUrl = track.album?.images?.[0]?.url ?? null;
    if (albumImageUrl && track.id) {
      await db.update(schema.tracks)
        .set({ imageUrl: albumImageUrl })
        .where(eq(schema.tracks.spotifyTrackId, track.id));
      tracksUpdated++;
    }

    // Collect artist IDs for enrichment
    for (const artist of track.artists ?? []) {
      if (artist.id) artistIdsToFetch.push(artist.id);
    }
  }

  console.log(`✅ Updated ${tracksUpdated} tracks with album art from recently-played`);

  // Fetch full artist profiles using user token (user-read-recently-played scope allows /artists)
  const uniqueArtistIds = [...new Set(artistIdsToFetch)];
  console.log(`\nFetching ${uniqueArtistIds.length} artist profiles...`);

  for (const batch of await chunkArr(uniqueArtistIds, 50)) {
    const artistRes = await fetch(`https://api.spotify.com/v1/artists?ids=${batch.join(',')}`, { headers });
    console.log(`  Artists batch status: ${artistRes.status}`);
    if (!artistRes.ok) {
      console.error('  Error:', await artistRes.text());
      continue;
    }
    const artistData: any = await artistRes.json();
    for (const artist of artistData.artists ?? []) {
      const img = artist?.images?.[0]?.url;
      if (img) {
        await db.update(schema.artists)
          .set({ imageUrl: img })
          .where(eq(schema.artists.spotifyArtistId, artist.id));
        artistsUpdated++;
      }
    }
  }

  console.log(`✅ Updated ${artistsUpdated} artists with profile photos`);
  console.log('\n🎉 Done!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
