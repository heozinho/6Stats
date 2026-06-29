import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import { eq } from 'drizzle-orm';

const connectionString = 'postgresql://postgres:Welovepurple12%3F@db.eosghccvgazzqoazbnjd.supabase.co:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

const SPOTIFY_CLIENT_ID = '9a1ca717d6b1408b933d3b01a6e97a37';
const SPOTIFY_CLIENT_SECRET = 'ca4a6bed18004c20aed57954337527ae';

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

async function testEndpoint(name: string, url: string, token: string) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`Endpoint: ${name} -> Status: ${res.status}`);
    if (res.ok) {
        const data: any = await res.json();
        // Just check if images exist in the first item
        const firstItem = data.items ? data.items[0] : data;
        console.log(`  Has Images: ${!!(firstItem?.images || firstItem?.album?.images)}`);
    } else {
        console.log(`  Error: ${await res.text()}`);
    }
}

async function main() {
  const token = await getFreshUserToken();
  
  console.log('--- Testing Endpoints ---');
  // 1. Top Artists (Personalized)
  await testEndpoint('Top Artists (/me/top/artists)', 'https://api.spotify.com/v1/me/top/artists?limit=1', token);
  
  // 2. Search Artist (Catalog)
  await testEndpoint('Search Artist (/search)', 'https://api.spotify.com/v1/search?q=artist:Celia&type=artist&limit=1', token);
  
  // 3. Specific Artist (Catalog - we know this failed in backfill)
  await testEndpoint('Specific Artist (/artists/{id})', 'https://api.spotify.com/v1/artists/71mZktYgZiBSmsYanRREQP', token);

  process.exit(0);
}

main().catch(console.error);
