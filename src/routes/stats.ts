import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { getDb } from '../db';
import { tracks, artists, listeningEvents } from '../db/schema';
import { eq, desc, and, gte, lt, sql } from 'drizzle-orm';
import { getRedis, getCache, setCache } from '../services/cache';
import { getStartOfDayUTC, getEndOfDayUTC, getRollingWeekStartUTC } from '../services/timezone';

export const stats = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── /stats/today ────────────────────────────────────────────────────────────
// Queries listening_events directly so timezone is handled correctly.
// Accepts ?tz=Europe/London (defaults to UTC).
stats.get('/today', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const tz = c.req.query('tz') || 'UTC';

  const start = getStartOfDayUTC(tz);
  const end   = getEndOfDayUTC(tz);

  const db = getDb(env.DATABASE_URL);

  const rows = await db.select({ durationMs: listeningEvents.durationMs })
    .from(listeningEvents)
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end),
    ));

  const totalMs    = rows.reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
  const totalPlays = rows.length;

  return c.json({ totalMs, totalPlays });
});

// ─── /stats/top-tracks ───────────────────────────────────────────────────────
// ?tz=Europe/London  &period=today (default) | week
stats.get('/top-tracks', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const tz     = c.req.query('tz')     || 'UTC';
  const period = c.req.query('period') || 'today';
  const db = getDb(env.DATABASE_URL);

  const start = period === 'week' ? getRollingWeekStartUTC(tz) : getStartOfDayUTC(tz);
  const end   = getEndOfDayUTC(tz);

  const result = await db.select({
    trackId:   listeningEvents.spotifyTrackId,
    name:      tracks.name,
    imageUrl:  tracks.imageUrl,
    artistId:  tracks.artistId,
    msPlayed:  sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`,
    playCount: sql<number>`cast(count(*) as int)`,
  })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId))
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end),
    ))
    .groupBy(
      listeningEvents.spotifyTrackId,
      tracks.spotifyTrackId,
      tracks.name,
      tracks.imageUrl,
      tracks.artistId,
    )
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return c.json({ topTracks: result });
});

// ─── /stats/top-artists ──────────────────────────────────────────────────────
// ?tz=Europe/London  &period=today | week
stats.get('/top-artists', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const tz     = c.req.query('tz')     || 'UTC';
  const period = c.req.query('period') || 'today';
  const db = getDb(env.DATABASE_URL);

  const start = period === 'week' ? getRollingWeekStartUTC(tz) : getStartOfDayUTC(tz);
  const end   = getEndOfDayUTC(tz);

  const result = await db.select({
    artistId:  tracks.artistId,
    name:      artists.name,
    imageUrl:  artists.imageUrl,
    genres:    artists.genres,
    msPlayed:  sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`,
    playCount: sql<number>`cast(count(*) as int)`,
  })
    .from(listeningEvents)
    .innerJoin(tracks,   eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId))
    .innerJoin(artists,  eq(tracks.artistId, artists.spotifyArtistId))
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end),
    ))
    .groupBy(tracks.artistId, artists.spotifyArtistId, artists.name, artists.imageUrl, artists.genres)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return c.json({ topArtists: result });
});

// ─── /stats/week ─────────────────────────────────────────────────────────────
// Returns hero totals for the current week.
// ?tz=Europe/London
stats.get('/week', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const tz = c.req.query('tz') || 'UTC';
  const db = getDb(env.DATABASE_URL);

  const start = getRollingWeekStartUTC(tz);
  const end   = getEndOfDayUTC(tz);

  const rows = await db.select({ durationMs: listeningEvents.durationMs })
    .from(listeningEvents)
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end),
    ));

  return c.json({ totalMs: rows.reduce((a, r) => a + (r.durationMs ?? 0), 0), totalPlays: rows.length });
});

// ─── /stats/history ──────────────────────────────────────────────────────────
stats.get('/history', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const db = getDb(env.DATABASE_URL);

  const page   = parseInt(c.req.query('page')  ?? '0');
  const limit  = Math.min(parseInt(c.req.query('limit') ?? '50'), 100);
  const offset = page * limit;

  const result = await db.select({
    id:         listeningEvents.id,
    playedAt:   listeningEvents.playedAt,
    durationMs: listeningEvents.durationMs,
    source:     listeningEvents.source,
    trackId:    tracks.spotifyTrackId,
    trackName:  tracks.name,
    imageUrl:   tracks.imageUrl,
    artistId:   tracks.artistId,
    artistName: artists.name,
    tempo:      tracks.tempo,
  })
    .from(listeningEvents)
    .innerJoin(tracks,  eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId))
    .leftJoin(artists,  eq(tracks.artistId, artists.spotifyArtistId))
    .where(eq(listeningEvents.userId, userId))
    .orderBy(desc(listeningEvents.playedAt))
    .limit(limit)
    .offset(offset);

  return c.json({ history: result, page, limit, hasMore: result.length === limit });
});

// ─── /stats/dashboard (BATCHED) ─────────────────────────────────────────────
stats.get('/dashboard', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const tz = c.req.query('tz') || 'UTC';
  const db = getDb(env.DATABASE_URL);

  const startDay  = getStartOfDayUTC(tz);
  const startWeek = getRollingWeekStartUTC(tz);
  const end       = getEndOfDayUTC(tz);

  // Run all queries in parallel on the database
  const [todayRows, weekRows, topTracksToday, topTracksWeek, topArtistsToday, topArtistsWeek, history] = await Promise.all([
    // Today Hero
    db.select({ durationMs: listeningEvents.durationMs }).from(listeningEvents).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startDay), lt(listeningEvents.playedAt, end))),
    // Week Hero
    db.select({ durationMs: listeningEvents.durationMs }).from(listeningEvents).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startWeek), lt(listeningEvents.playedAt, end))),
    // Top Tracks Today
    db.select({ trackId: tracks.spotifyTrackId, name: tracks.name, imageUrl: tracks.imageUrl, artistId: tracks.artistId, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startDay), lt(listeningEvents.playedAt, end))).groupBy(listeningEvents.spotifyTrackId, tracks.spotifyTrackId, tracks.name, tracks.imageUrl, tracks.artistId).orderBy(desc(sql`count(*)`)).limit(10),
    // Top Tracks Week
    db.select({ trackId: tracks.spotifyTrackId, name: tracks.name, imageUrl: tracks.imageUrl, artistId: tracks.artistId, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startWeek), lt(listeningEvents.playedAt, end))).groupBy(listeningEvents.spotifyTrackId, tracks.spotifyTrackId, tracks.name, tracks.imageUrl, tracks.artistId).orderBy(desc(sql`count(*)`)).limit(10),
    // Top Artists Today
    db.select({ artistId: tracks.artistId, name: artists.name, imageUrl: artists.imageUrl, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).innerJoin(artists, eq(tracks.artistId, artists.spotifyArtistId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startDay), lt(listeningEvents.playedAt, end))).groupBy(tracks.artistId, artists.spotifyArtistId, artists.name, artists.imageUrl).orderBy(desc(sql`count(*)`)).limit(10),
    // Top Artists Week
    db.select({ artistId: tracks.artistId, name: artists.name, imageUrl: artists.imageUrl, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).innerJoin(artists, eq(tracks.artistId, artists.spotifyArtistId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startWeek), lt(listeningEvents.playedAt, end))).groupBy(tracks.artistId, artists.spotifyArtistId, artists.name, artists.imageUrl).orderBy(desc(sql`count(*)`)).limit(10),
    // History (DNA)
    db.select({ id: listeningEvents.id, spotifyTrackId: tracks.spotifyTrackId, tempo: tracks.tempo }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).where(eq(listeningEvents.userId, userId)).orderBy(desc(listeningEvents.playedAt)).limit(50)
  ]);

  return c.json({
    today: { totalMs: todayRows.reduce((acc, r) => acc + (r.durationMs ?? 0), 0), totalPlays: todayRows.length },
    week:  { totalMs: weekRows.reduce((acc, r) => acc + (r.durationMs ?? 0), 0), totalPlays: weekRows.length },
    topTracks: { today: topTracksToday, week: topTracksWeek },
    topArtists: { today: topArtistsToday, week: topArtistsWeek },
    history
  });
});
