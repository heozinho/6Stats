import { getDb } from '../src/db';
import { artists } from '../src/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { getValidSpotifyToken } from '../src/services/spotify';
import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

const env = process.env as any;

async function backfillArtistImages() {
  const db = getDb(env.DATABASE_URL);
  
  // Use user's token (we know the user ID dfcae32d-bab4-4e0f-8714-f1a3dbeae5a5)
  const token = await getValidSpotifyToken('dfcae32d-bab4-4e0f-8714-f1a3dbeae5a5', db, env);
  
  const missing = await db.select().from(artists).where(isNull(artists.imageUrl));
  console.log(`Found ${missing.length} artists missing images`);
  
  // Chunk into 50s
  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    const ids = chunk.map(a => a.spotifyArtistId).join(',');
    
    try {
      const res = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json() as any;
        for (const artist of data.artists ?? []) {
          const imgUrl = artist?.images?.[0]?.url;
          const genres = artist?.genres ?? [];
          if (imgUrl || genres.length > 0) {
            await db.update(artists)
              .set({ 
                ...(imgUrl ? { imageUrl: imgUrl } : {}),
                ...(genres.length > 0 ? { genres } : {})
              })
              .where(eq(artists.spotifyArtistId, artist.id));
          }
        }
        console.log(`Updated chunk ${i / 50 + 1}`);
      } else {
        console.log(`Spotify error: ${res.status}`);
      }
    } catch (e) {
      console.error(e);
    }
  }
  console.log('Done!');
}

backfillArtistImages().then(() => process.exit(0)).catch(console.error);
