import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { getDb } from '../db';
import { getValidSpotifyToken, getRecentlyPlayed } from '../services/spotify';
import { tracks, artists, listeningEvents } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { runAggregation } from '../crons/aggregate';
import { getRedis, deleteCache } from '../services/cache';

export const sync = new Hono<{ Bindings: Bindings; Variables: Variables }>();

sync.post('/recent', async (c) => {
  const userId = c.get('userId');
  const env = c.env;
  const db = getDb(env.DATABASE_URL);

  try {
    console.log('[sync] step 1: getting valid token for', userId);
    const token = await getValidSpotifyToken(userId, db, env);
    
    console.log('[sync] step 2: fetching recently played');
    const recent = await getRecentlyPlayed(token, 50);

    if (recent.items.length === 0) {
      return c.json({ message: 'No new tracks' });
    }

    console.log('[sync] step 3: got', recent.items.length, 'items, building inserts');
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
        });
      }

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

    console.log('[sync] step 4: upserting', newArtists.length, 'artists');
    if (newArtists.length > 0) {
      await db.insert(artists).values(newArtists).onConflictDoNothing();
    }
    
    console.log('[sync] step 5: upserting', newTracks.length, 'tracks');
    if (newTracks.length > 0) {
      await db.insert(tracks).values(newTracks).onConflictDoUpdate({
        target: tracks.spotifyTrackId,
        set: {
          imageUrl: sql`COALESCE(EXCLUDED.image_url, image_url)`,
        },
      });
    }

    // Enrich artists with profile images
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
        } else {
          console.log('[sync] artist enrich returned', artistRes.status);
        }
      } catch (err) {
        console.error('[sync] artist enrich failed:', err);
      }
    }
    
    console.log('[sync] step 6: inserting', newEvents.length, 'events');
    if (newEvents.length > 0) {
      await db.insert(listeningEvents).values(newEvents).onConflictDoNothing();
    }

    console.log('[sync] step 7: running aggregation');
    await runAggregation(env);

    console.log('[sync] step 8: busting cache');
    const redis = getRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
    await deleteCache(redis, `stats:today:${userId}`);

    console.log('[sync] done');
    return c.json({ message: 'Sync complete', synced: newEvents.length });
  } catch (err: any) {
    console.error('[sync] FAILED:', err.message, err.stack);
    return c.json({ error: err.message, stack: err.stack }, 500);
  }

});
