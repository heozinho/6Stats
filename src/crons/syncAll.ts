import { Bindings } from '../types';
import { getDb } from '../db';
import { users, spotifyTokens, tracks, artists, listeningEvents } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { getValidSpotifyToken, getRecentlyPlayed } from '../services/spotify';
import { runAggregation } from './aggregate';

/**
 * Runs a full sync for every user that has an active Spotify token.
 * Called by the Cloudflare scheduled worker at midnight each day.
 */
export async function syncAllUsers(env: Bindings) {
  const db = getDb(env.DATABASE_URL);

  // Fetch all users that have a token stored
  const allUsers = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(spotifyTokens, eq(spotifyTokens.userId, users.id));

  console.log(`[syncAll] Syncing ${allUsers.length} user(s)`);

  for (const user of allUsers) {
    try {
      const token = await getValidSpotifyToken(user.id, db, env);
      const recent = await getRecentlyPlayed(token, 50);

      if (recent.items.length === 0) continue;

      const newTracks: any[] = [];
      const newArtists: any[] = [];
      const newEvents: any[] = [];

      for (const item of recent.items) {
        const track = item.track;

        if (track.artists?.length > 0) {
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
          userId: user.id,
          spotifyTrackId: track.id,
          playedAt: new Date(item.played_at),
          durationMs: track.duration_ms,
          source: item.context?.type || 'unknown',
          processed: false,
        });
      }

      if (newArtists.length > 0) {
        const uniqueArtists = Array.from(new Map(newArtists.map(a => [a.spotifyArtistId, a])).values());
        await db.insert(artists).values(uniqueArtists).onConflictDoNothing();
      }

      if (newTracks.length > 0) {
        const uniqueTracks = Array.from(new Map(newTracks.map(t => [t.spotifyTrackId, t])).values());
        await db.insert(tracks).values(uniqueTracks).onConflictDoUpdate({
          target: tracks.spotifyTrackId,
          set: { imageUrl: sql`COALESCE(EXCLUDED.image_url, tracks.image_url)` },
        });
      }

      // Enrich artist images
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
          }
        } catch (err) {
          console.error(`[syncAll] Artist enrichment failed for user ${user.id}:`, err);
        }
      }

      if (newEvents.length > 0) {
        // Deduplicate events by (userId, trackId, playedAt)
        const uniqueEvents = Array.from(new Map(newEvents.map(e => [`${e.userId}-${e.spotifyTrackId}-${e.playedAt.getTime()}`, e])).values());
        await db.insert(listeningEvents).values(uniqueEvents).onConflictDoNothing();
      }

      console.log(`[syncAll] User ${user.id}: synced ${newEvents.length} event(s)`);
    } catch (err) {
      console.error(`[syncAll] Failed for user ${user.id}:`, err);
    }
  }

  // Run aggregation once for all users after syncing
  try {
    await runAggregation(env);
    console.log('[syncAll] Aggregation complete');
  } catch (aggErr) {
    console.error('[syncAll] Aggregation failed completely:', aggErr);
  }
}
