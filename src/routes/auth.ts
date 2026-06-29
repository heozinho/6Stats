import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { exchangeCodeForToken, getUserProfile } from '../services/spotify';
import { getDb } from '../db';
import { users, spotifyTokens, apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import { getValidSpotifyToken } from '../services/spotify';

export const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post('/spotify/connect', async (c) => {
  const { code, redirect_uri } = await c.req.json();
  const env = c.env;

  if (!code) {
    return c.json({ error: 'Code is required' }, 400);
  }

  try {
    const redirectUri = redirect_uri || `${env.APP_URL}/auth/callback`; // Fallback to env
    const tokenData = await exchangeCodeForToken(code, redirectUri, env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
    
    const profile = await getUserProfile(tokenData.access_token);
    
    const db = getDb(env.DATABASE_URL);
    
    // Check if user exists
    let user = await db.select().from(users).where(eq(users.spotifyUserId, profile.id)).limit(1).then(res => res[0]);
    
    const imageUrl = profile.images.length > 0 ? profile.images[0].url : null;
    
    if (!user) {
      // Create user
      const inserted = await db.insert(users).values({
        id: crypto.randomUUID(),
        spotifyUserId: profile.id,
        displayName: profile.display_name,
        imageUrl,
      }).returning();
      user = inserted[0];
    } else {
      // Update display name and image url
      await db.update(users).set({
        displayName: profile.display_name,
        imageUrl,
      }).where(eq(users.id, user.id));
    }

    // Upsert tokens
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    await db.insert(spotifyTokens).values({
      userId: user.id,
      accessTokenEncrypted: tokenData.access_token, // Ideally we encrypt these
      refreshTokenEncrypted: tokenData.refresh_token, // Ideally encrypt
      expiresAt,
    }).onConflictDoUpdate({
      target: spotifyTokens.userId,
      set: {
        accessTokenEncrypted: tokenData.access_token,
        refreshTokenEncrypted: tokenData.refresh_token,
        expiresAt,
      }
    });

    // Create session JWT
    const token = await sign({
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    }, env.JWT_SECRET);

    return c.json({ token, user });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Middleware for JWT protected auth routes
auth.use('/api-keys*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  });
  return jwtMiddleware(c, next);
});

auth.get('/api-keys', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub as string;
  const db = getDb(c.env.DATABASE_URL);
  
  const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  return c.json(keys);
});

auth.post('/api-keys', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub as string;
  const db = getDb(c.env.DATABASE_URL);
  
  // Generate a random key
  const key = 'mz_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  
  const inserted = await db.insert(apiKeys).values({
    id: crypto.randomUUID(),
    userId,
    key,
  }).returning();
  
  return c.json(inserted[0]);
});

auth.delete('/api-keys/:id', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub as string;
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return c.json({ success: true });
});

// Endpoint for Muzeebra to get Spotify token
auth.get('/muzeebra/token', async (c) => {
  const apiKey = c.req.header('x-api-key') || c.req.query('api_key');
  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  const db = getDb(c.env.DATABASE_URL);
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.key, apiKey)).limit(1);
  const apiKeyRecord = rows[0];

  if (!apiKeyRecord) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  try {
    const accessToken = await getValidSpotifyToken(apiKeyRecord.userId, db, c.env);
    return c.json({ access_token: accessToken });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

