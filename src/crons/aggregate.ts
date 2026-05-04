import { Bindings } from '../types';
import { getDb } from '../db';
import { listeningEvents, dailyUserStats, dailyTrackStats, dailyArtistStats, tracks } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function runAggregation(env: Bindings) {
  const db = getDb(env.DATABASE_URL);
  
  // Find unprocessed events. In production, we'd process in batches.
  const unprocessed = await db.select({
    id: listeningEvents.id,
    userId: listeningEvents.userId,
    playedAt: listeningEvents.playedAt,
    durationMs: listeningEvents.durationMs,
    spotifyTrackId: listeningEvents.spotifyTrackId,
    artistId: tracks.artistId,
  })
    .from(listeningEvents)
    .innerJoin(tracks, eq(listeningEvents.spotifyTrackId, tracks.spotifyTrackId))
    .where(eq(listeningEvents.processed, false))
    .limit(1000); // Batch size

  if (unprocessed.length === 0) return;

  const userStatsMap = new Map();
  const trackStatsMap = new Map();
  const artistStatsMap = new Map();

  for (const event of unprocessed) {
    const date = new Date(event.playedAt).toISOString().split('T')[0];
    
    // Aggregate User
    const userKey = `${event.userId}_${date}`;
    if (!userStatsMap.has(userKey)) {
      userStatsMap.set(userKey, { userId: event.userId, date, totalMs: 0, totalPlays: 0 });
    }
    const us = userStatsMap.get(userKey);
    us.totalMs += event.durationMs || 0;
    us.totalPlays += 1;

    // Aggregate Track
    const trackKey = `${event.userId}_${date}_${event.spotifyTrackId}`;
    if (!trackStatsMap.has(trackKey)) {
      trackStatsMap.set(trackKey, { userId: event.userId, date, spotifyTrackId: event.spotifyTrackId, msPlayed: 0, playCount: 0 });
    }
    const ts = trackStatsMap.get(trackKey);
    ts.msPlayed += event.durationMs || 0;
    ts.playCount += 1;

    // Aggregate Artist
    if (event.artistId) {
      const artistKey = `${event.userId}_${date}_${event.artistId}`;
      if (!artistStatsMap.has(artistKey)) {
        artistStatsMap.set(artistKey, { userId: event.userId, date, spotifyArtistId: event.artistId, msPlayed: 0, playCount: 0 });
      }
      const as = artistStatsMap.get(artistKey);
      as.msPlayed += event.durationMs || 0;
      as.playCount += 1;
    }
  }

  // Transaction to insert all
  await db.transaction(async (tx) => {
    // Insert User Stats
    for (const stats of userStatsMap.values()) {
      await tx.insert(dailyUserStats).values(stats).onConflictDoUpdate({
        target: [dailyUserStats.userId, dailyUserStats.date],
        set: {
          totalMs: sql`${dailyUserStats.totalMs} + ${stats.totalMs}`,
          totalPlays: sql`${dailyUserStats.totalPlays} + ${stats.totalPlays}`,
        }
      });
    }

    // Insert Track Stats
    for (const stats of trackStatsMap.values()) {
      await tx.insert(dailyTrackStats).values(stats).onConflictDoUpdate({
        target: [dailyTrackStats.userId, dailyTrackStats.date, dailyTrackStats.spotifyTrackId],
        set: {
          msPlayed: sql`${dailyTrackStats.msPlayed} + ${stats.msPlayed}`,
          playCount: sql`${dailyTrackStats.playCount} + ${stats.playCount}`,
        }
      });
    }

    // Insert Artist Stats
    for (const stats of artistStatsMap.values()) {
      await tx.insert(dailyArtistStats).values(stats).onConflictDoUpdate({
        target: [dailyArtistStats.userId, dailyArtistStats.date, dailyArtistStats.spotifyArtistId],
        set: {
          msPlayed: sql`${dailyArtistStats.msPlayed} + ${stats.msPlayed}`,
          playCount: sql`${dailyArtistStats.playCount} + ${stats.playCount}`,
        }
      });
    }

    // Mark all as processed in a single query instead of N individual updates
    const idsToMark = unprocessed.map(e => e.id);
    if (idsToMark.length > 0) {
      await tx.execute(
        sql`UPDATE listening_events SET processed = true WHERE id = ANY(ARRAY[${sql.join(idsToMark.map(id => sql`${id}`), sql`, `)}])`
      );
    }
  });
}
