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

    // Enrich artists with profile images from Spotify
    // Note: We use the User Token here as Client Credentials often 403 in Dev Mode.
    const allArtistIds = [...new Set(newArtists.map(a => a.spotifyArtistId))];
    if (allArtistIds.length > 0) {
      try {
        const artistRes = await fetch(
          `https://api.spotify.com/v1/artists?ids=${allArtistIds.slice(0, 50).join(',')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (artistRes.ok) {
          const artistData: any = await artistRes.json();
          for (const artist of artistData.artists ?? []) {
            const imgUrl = artist.images?.[0]?.url ?? null;
            if (imgUrl) {
              await db.update(artists)
                .set({ imageUrl: imgUrl })
                .where(eq(artists.spotifyArtistId, artist.id));
            }
          }
        } else if (artistRes.status === 403) {
          // If batch fails, we can try a few top ones individually or skip
          console.error('Spotify Artists batch API returned 403. Check user allowlist in dashboard.');
        }
      } catch (err) {
        console.error('Failed to enrich artists:', err);
      }
    }
    
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
