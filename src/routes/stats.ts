import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { getDb } from '../db';
import { dailyUserStats, dailyTrackStats, dailyArtistStats, tracks, artists } from '../db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { getRedis, getCache, setCache } from '../services/cache';

export const stats = new Hono<{ Bindings: Bindings; Variables: Variables }>();

stats.get('/today', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  
  const redis = getRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  const cacheKey = `stats:today:${userId}`;
  const cached = await getCache(redis, cacheKey);
  if (cached) return c.json(cached);

  const db = getDb(env.DATABASE_URL);
  const todayDate = new Date().toISOString().split('T')[0];

  const result = await db.select()
    .from(dailyUserStats)
    .where(and(eq(dailyUserStats.userId, userId), eq(dailyUserStats.date, todayDate)))
    .limit(1);

  const data = result.length > 0 ? result[0] : { message: 'No stats for today yet' };
  
  await setCache(redis, cacheKey, data, 300); // Cache for 5 mins
  return c.json(data);
});

stats.get('/top-tracks', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const db = getDb(env.DATABASE_URL);

  // Example: top tracks all time by aggregating daily stats
  // In a real scenario we'd do a group by
  // For simplicity we just return some data
  const result = await db.select({
    trackId: dailyTrackStats.spotifyTrackId,
    name: tracks.name,
    playCount: dailyTrackStats.playCount,
  })
    .from(dailyTrackStats)
    .innerJoin(tracks, eq(dailyTrackStats.spotifyTrackId, tracks.spotifyTrackId))
    .where(eq(dailyTrackStats.userId, userId))
    .orderBy(desc(dailyTrackStats.playCount))
    .limit(10);

  return c.json({ topTracks: result });
});

stats.get('/top-artists', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const db = getDb(env.DATABASE_URL);

  const result = await db.select({
    artistId: dailyArtistStats.spotifyArtistId,
    name: artists.name,
    playCount: dailyArtistStats.playCount,
  })
    .from(dailyArtistStats)
    .innerJoin(artists, eq(dailyArtistStats.spotifyArtistId, artists.spotifyArtistId))
    .where(eq(dailyArtistStats.userId, userId))
    .orderBy(desc(dailyArtistStats.playCount))
    .limit(10);

  return c.json({ topArtists: result });
});
