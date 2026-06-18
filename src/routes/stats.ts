import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { getDb } from '../db';
import { listeningEvents, tracks, artists } from '../db/schema';
import { eq, desc, and, gte, lt, sql } from 'drizzle-orm';
import { getStartOfDayUTC, getRollingWeekStartUTC, getEndOfDayUTC } from '../services/timezone';

export const stats = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── /stats/today ────────────────────────────────────────────────────────────
stats.get('/today', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const tz = c.req.query('tz') || 'UTC';
  const db = getDb(env.DATABASE_URL);

  const start = getStartOfDayUTC(tz);
  const end = getEndOfDayUTC(tz);

  const result = await db.select({
    durationMs: listeningEvents.durationMs
  }).from(listeningEvents)
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end)
    ));

  const totalMs = result.reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
  const totalPlays = result.length;

  return c.json({ totalMs, totalPlays });
});

// ─── /stats/week ─────────────────────────────────────────────────────────────
stats.get('/week', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const tz = c.req.query('tz') || 'UTC';
  const db = getDb(env.DATABASE_URL);

  const start = getRollingWeekStartUTC(tz);
  const end = getEndOfDayUTC(tz);

  const result = await db.select({
    durationMs: listeningEvents.durationMs
  }).from(listeningEvents)
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end)
    ));

  const totalMs = result.reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
  const totalPlays = result.length;

  return c.json({ totalMs, totalPlays });
});

// ─── /stats/top-tracks ───────────────────────────────────────────────────────
stats.get('/top-tracks', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const period = c.req.query('period') || 'today';
  const tz = c.req.query('tz') || 'UTC';
  const db = getDb(env.DATABASE_URL);

  const start = period === 'week' ? getRollingWeekStartUTC(tz) : getStartOfDayUTC(tz);
  const end = getEndOfDayUTC(tz);

  const topTracks = await db.select({
    trackId: tracks.spotifyTrackId,
    name: tracks.name,
    imageUrl: tracks.imageUrl,
    artistId: tracks.artistId,
    playCount: sql<number>`cast(count(*) as int)`,
    msPlayed: sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`,
  })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId))
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end)
    ))
    .groupBy(listeningEvents.spotifyTrackId, tracks.spotifyTrackId, tracks.name, tracks.imageUrl, tracks.artistId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return c.json({ topTracks });
});

// ─── /stats/top-artists ──────────────────────────────────────────────────────
stats.get('/top-artists', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const period = c.req.query('period') || 'today';
  const tz = c.req.query('tz') || 'UTC';
  const db = getDb(env.DATABASE_URL);

  const start = period === 'week' ? getRollingWeekStartUTC(tz) : getStartOfDayUTC(tz);
  const end = getEndOfDayUTC(tz);

  const topArtists = await db.select({
    artistId: tracks.artistId,
    name: artists.name,
    imageUrl: artists.imageUrl,
    playCount: sql<number>`cast(count(*) as int)`,
    msPlayed: sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`,
  })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId))
    .innerJoin(artists, eq(tracks.artistId, artists.spotifyArtistId))
    .where(and(
      eq(listeningEvents.userId, userId),
      gte(listeningEvents.playedAt, start),
      lt(listeningEvents.playedAt, end)
    ))
    .groupBy(tracks.artistId, artists.spotifyArtistId, artists.name, artists.imageUrl)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return c.json({ topArtists });
});

// ─── /stats/history ──────────────────────────────────────────────────────────
stats.get('/history', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;
  const db = getDb(env.DATABASE_URL);

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
    previewUrl: tracks.previewUrl,
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
  const [todayRows, weekRows, topTracksToday, topTracksWeek, topArtistsToday, topArtistsWeek, history, heatmapRows] = await Promise.all([
    // Today Hero
    db.select({ durationMs: listeningEvents.durationMs }).from(listeningEvents).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startDay), lt(listeningEvents.playedAt, end))),
    // Week Hero
    db.select({ durationMs: listeningEvents.durationMs }).from(listeningEvents).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startWeek), lt(listeningEvents.playedAt, end))),
    // Top Tracks Today
    db.select({ trackId: tracks.spotifyTrackId, name: tracks.name, imageUrl: tracks.imageUrl, artistId: tracks.artistId, msPlayed: sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startDay), lt(listeningEvents.playedAt, end))).groupBy(listeningEvents.spotifyTrackId, tracks.spotifyTrackId, tracks.name, tracks.imageUrl, tracks.artistId).orderBy(desc(sql`count(*)`)).limit(10),
    // Top Tracks Week
    db.select({ trackId: tracks.spotifyTrackId, name: tracks.name, imageUrl: tracks.imageUrl, artistId: tracks.artistId, msPlayed: sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startWeek), lt(listeningEvents.playedAt, end))).groupBy(listeningEvents.spotifyTrackId, tracks.spotifyTrackId, tracks.name, tracks.imageUrl, tracks.artistId).orderBy(desc(sql`count(*)`)).limit(10),
    // Top Artists Today
    db.select({ artistId: tracks.artistId, name: artists.name, imageUrl: artists.imageUrl, msPlayed: sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).innerJoin(artists, eq(tracks.artistId, artists.spotifyArtistId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startDay), lt(listeningEvents.playedAt, end))).groupBy(tracks.artistId, artists.spotifyArtistId, artists.name, artists.imageUrl).orderBy(desc(sql`count(*)`)).limit(10),
    // Top Artists Week
    db.select({ artistId: tracks.artistId, name: artists.name, imageUrl: artists.imageUrl, msPlayed: sql<number>`cast(sum(${listeningEvents.durationMs}) as int)`, playCount: sql<number>`cast(count(*) as int)` }).from(listeningEvents).innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId)).innerJoin(artists, eq(tracks.artistId, artists.spotifyArtistId)).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startWeek), lt(listeningEvents.playedAt, end))).groupBy(tracks.artistId, artists.spotifyArtistId, artists.name, artists.imageUrl).orderBy(desc(sql`count(*)`)).limit(10),
    // History (DNA)
    db.select({ 
      id: listeningEvents.id, 
      spotifyTrackId: tracks.spotifyTrackId, 
      trackName: tracks.name,
      artistName: artists.name,
      tempo: tracks.tempo,
      valence: tracks.valence,
      energy: tracks.energy,
      danceability: tracks.danceability,
      previewUrl: tracks.previewUrl
    })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId))
    .leftJoin(artists, eq(tracks.artistId, artists.spotifyArtistId))
    .where(eq(listeningEvents.userId, userId))
    .orderBy(desc(listeningEvents.playedAt))
    .limit(50),
    // Heatmap (Last 7 days)
    db.select({ playedAt: listeningEvents.playedAt }).from(listeningEvents).where(and(eq(listeningEvents.userId, userId), gte(listeningEvents.playedAt, startWeek), lt(listeningEvents.playedAt, end)))
  ]);

  // Aggregate Heatmap
  const heatmap: Record<string, number> = {};
  for (const row of heatmapRows) {
    const d = new Date(row.playedAt);
    const hour = d.getUTCHours();
    const day  = d.getUTCDay(); // 0-6
    const key  = `${day}-${hour}`;
    heatmap[key] = (heatmap[key] || 0) + 1;
  }

  return c.json({
    today: { totalMs: todayRows.reduce((acc, r) => acc + (r.durationMs ?? 0), 0), totalPlays: todayRows.length },
    week:  { totalMs: weekRows.reduce((acc, r) => acc + (r.durationMs ?? 0), 0), totalPlays: weekRows.length },
    topTracks: { today: topTracksToday, week: topTracksWeek },
    topArtists: { today: topArtistsToday, week: topArtistsWeek },
    history,
    heatmap
  });
});
