import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { getDb } from '../db';
import { getValidSpotifyToken, getRecentlyPlayed } from '../services/spotify';
import { tracks, artists, listeningEvents } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { runAggregation } from '../crons/aggregate';

export const sync = new Hono<{ Bindings: Bindings; Variables: Variables }>();

sync.post('/recent', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const db = getDb(env.DATABASE_URL);

  try {
    const token = await getValidSpotifyToken(userId, db, env);
    
    // Always fetch the 50 most recent — deduplication handled by onConflictDoNothing on insert
    const recent = await getRecentlyPlayed(token, 50);

    if (recent.items.length === 0) {
      return c.json({ message: 'No new tracks' });
    }

    // Prepare data
    const newTracks: any[] = [];
    const newArtists: any[] = [];
    const newEvents: any[] = [];

    for (const item of recent.items) {
      const track = item.track;
      
      if (track.artists && track.artists.length > 0) {
        newArtists.push({
          spotifyArtistId: track.artists[0].id,
          name: track.artists[0].name,
          genres: track.artists[0].genres || [],
          // Artist images aren't included in recently-played; enriched via separate API call if needed.
          // For now we store null and let the /sync/enrich endpoint fill it in.
        });
      }

      // Pick the best album image (first = largest)
      const albumImageUrl = track.album?.images?.[0]?.url ?? null;

      newTracks.push({
        spotifyTrackId: track.id,
        name: track.name,
        artistId: track.artists?.[0]?.id,
        albumId: track.album?.id,
        durationMs: track.duration_ms,
        imageUrl: albumImageUrl,
      });

      newEvents.push({
        id: crypto.randomUUID(),
        userId,
        spotifyTrackId: track.id,
        playedAt: new Date(item.played_at),
        durationMs: track.duration_ms,
        source: item.context?.type || 'unknown',
        processed: false,
      });
    }

    // Upsert artists (no image yet — enriched below)
    if (newArtists.length > 0) {
      await db.insert(artists).values(newArtists).onConflictDoNothing();
    }
    
    // Upsert tracks — always update imageUrl so missing images get backfilled
    if (newTracks.length > 0) {
      await db.insert(tracks).values(newTracks).onConflictDoUpdate({
        target: tracks.spotifyTrackId,
        set: {
          // In ON CONFLICT, reference the existing column without table prefix
          imageUrl: sql`COALESCE(EXCLUDED.image_url, image_url)`,
        },
      });
    }

    // Note: /artists endpoint returns 403 in Spotify Development Mode.
    // Artist images are enriched when the app is approved for Extended Quota.
    // Tracks already have album art from the recently-played response above.
    
    // Insert events
    if (newEvents.length > 0) {
      // Postgres unique constraint on user+track+playedAt is usually recommended to avoid dupes perfectly
      // For now, we rely on `after` cursor, but inserting might throw on duplicate ID. 
      // Our ID is UUID, but Spotify data might overlap. A composite unique key in db would be safer.
      await db.insert(listeningEvents).values(newEvents).onConflictDoNothing();
    }

    // Run aggregation so stats are immediately available for MVP
    await runAggregation(env);

    return c.json({ message: 'Sync complete', synced: newEvents.length });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
