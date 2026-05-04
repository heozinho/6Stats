import { spotifyTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com/api/token';

export async function exchangeCodeForToken(code: string, redirectUri: string, clientId: string, clientSecret: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  return response.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  }>;
}

export async function getUserProfile(accessToken: string) {
  const response = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return response.json() as Promise<{
    id: string;
    display_name: string;
    images: { url: string }[];
  }>;
}

export async function getRecentlyPlayed(accessToken: string, limit = 50, after?: number) {
  const url = new URL(`${SPOTIFY_API_URL}/me/player/recently-played`);
  url.searchParams.append('limit', limit.toString());
  if (after) {
    url.searchParams.append('after', after.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch recently played tracks');
  }

  return response.json() as Promise<{
    items: {
      track: {
        id: string;
        name: string;
        duration_ms: number;
        album: { id: string; name: string };
        artists: { id: string; name: string; genres?: string[] }[];
      };
      played_at: string;
      context?: { type: string; uri: string };
    }[];
    cursors?: { after: string; before: string };
  }>;
}

export async function getAudioFeatures(accessToken: string, trackIds: string[]) {
  const url = new URL(`${SPOTIFY_API_URL}/audio-features`);
  url.searchParams.append('ids', trackIds.join(','));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch audio features');
  }

  const data = await response.json() as { audio_features: any[] };
  return data.audio_features;
}

export async function getValidSpotifyToken(userId: string, db: any, env: any) {
  console.log('[getValidSpotifyToken] fetching token for', userId);

  const rows = await db
    .select()
    .from(spotifyTokens)
    .where(eq(spotifyTokens.userId, userId))
    .limit(1);

  const result = rows[0];

  if (!result) {
    throw new Error('Spotify connected account not found');
  }

  console.log('[getValidSpotifyToken] token expiresAt:', result.expiresAt, 'now:', new Date().toISOString());

  // Token still valid
  if (new Date() < new Date(result.expiresAt)) {
    console.log('[getValidSpotifyToken] token still valid');
    return result.accessTokenEncrypted;
  }

  // Token expired — refresh it
  console.log('[getValidSpotifyToken] token expired, refreshing...');
  const newTokens = await refreshAccessToken(
    result.refreshTokenEncrypted,
    env.SPOTIFY_CLIENT_ID,
    env.SPOTIFY_CLIENT_SECRET,
  );

  const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

  await db
    .update(spotifyTokens)
    .set({ accessTokenEncrypted: newTokens.access_token, expiresAt })
    .where(eq(spotifyTokens.userId, userId));

  console.log('[getValidSpotifyToken] token refreshed, new expiry:', expiresAt.toISOString());
  return newTokens.access_token;
}

