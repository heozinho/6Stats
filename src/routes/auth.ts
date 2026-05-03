import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { exchangeCodeForToken, getUserProfile } from '../services/spotify';
import { getDb } from '../db';
import { users, spotifyTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';

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
