import { getDb } from '../src/db';
import { getValidSpotifyToken, getRecentlyPlayed, getAudioFeatures } from '../src/services/spotify';
import { tracks, artists, listeningEvents } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { runAggregation } from '../src/crons/aggregate';
import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

const env = process.env as any;
const userId = 'dfcae32d-bab4-4e0f-8714-f1a3dbeae5a5';

async function testSync() {
  const db = getDb(env.DATABASE_URL);
  try {
    console.log('[sync] step 1: getting valid token for', userId);
    const token = await getValidSpotifyToken(userId, db, env);
    
    console.log('[sync] step 2: fetching recently played');
    const recent = await getRecentlyPlayed(token, 50);

    if (recent.items.length === 0) {
      console.log('No new tracks');
      return;
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
        previewUrl: track.preview_url ?? null,
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
      const uniqueArtists = Array.from(new Map(newArtists.map(a => [a.spotifyArtistId, a])).values());
      await db.insert(artists).values(uniqueArtists).onConflictDoNothing();
    }
    
    console.log('[sync] step 5: upserting', newTracks.length, 'tracks');
    if (newTracks.length > 0) {
      const uniqueTracks = Array.from(new Map(newTracks.map(t => [t.spotifyTrackId, t])).values());
      await db.insert(tracks).values(uniqueTracks).onConflictDoUpdate({
        target: tracks.spotifyTrackId,
        set: {
          imageUrl: sql`COALESCE(EXCLUDED.image_url, tracks.image_url)`,
        },
      });
    }

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
        console.error('[sync] artist enrich failed:', err);
      }
    }
    
    const trackIdsToEnrich = newTracks.map(t => t.spotifyTrackId);
    if (trackIdsToEnrich.length > 0) {
      try {
        const audioFeatures = await getAudioFeatures(token, trackIdsToEnrich);
        if (audioFeatures && Array.isArray(audioFeatures)) {
          for (const feature of audioFeatures) {
            if (!feature) continue;
            await db.update(tracks)
              .set({ 
                tempo: Math.round(feature.tempo || 0),
                valence: Math.round((feature.valence || 0) * 100),
                energy: Math.round((feature.energy || 0) * 100),
                danceability: Math.round((feature.danceability || 0) * 100),
                acousticness: Math.round((feature.acousticness || 0) * 100),
              })
              .where(eq(tracks.spotifyTrackId, feature.id));
          }
        }
      } catch (err) {
        console.error('[sync] audio features enrichment failed:', err);
      }
    }

    console.log('[sync] step 6: inserting', newEvents.length, 'events');
    if (newEvents.length > 0) {
      const uniqueEvents = Array.from(new Map(newEvents.map(e => [`${e.userId}-${e.spotifyTrackId}-${e.playedAt.getTime()}`, e])).values());
      await db.insert(listeningEvents).values(uniqueEvents).onConflictDoNothing();
    }

    console.log('[sync] step 7: running aggregation');
    await runAggregation(env);

    console.log('[sync] done');
  } catch (e) {
    console.error('ERROR', e);
  }
}

testSync().then(() => process.exit(0));
