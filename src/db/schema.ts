import { pgTable, text, timestamp, integer, boolean, date, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // We can use uuid or external id. Supabase users.id is uuid, but we'll use string here for flexibility.
  spotifyUserId: text('spotify_user_id').notNull().unique(),
  displayName: text('display_name'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const spotifyTokens = pgTable('spotify_tokens', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const tracks = pgTable('tracks', {
  spotifyTrackId: text('spotify_track_id').primaryKey(),
  name: text('name').notNull(),
  artistId: text('artist_id'), // Reference to artists table, could be multiple but we simplify to primary artist here
  albumId: text('album_id'),
  durationMs: integer('duration_ms').notNull(),
  imageUrl: text('image_url'),
  tempo: integer('tempo'),
  valence: integer('valence'),
  energy: integer('energy'),
  danceability: integer('danceability'),
  acousticness: integer('acousticness'),
  previewUrl: text('preview_url'),
});

export const artists = pgTable('artists', {
  spotifyArtistId: text('spotify_artist_id').primaryKey(),
  name: text('name').notNull(),
  genres: text('genres').array(),
  imageUrl: text('image_url'),
});

export const listeningEvents = pgTable('listening_events', {
  id: text('id').primaryKey(), // Could use uuid
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  spotifyTrackId: text('spotify_track_id').notNull().references(() => tracks.spotifyTrackId),
  playedAt: timestamp('played_at').notNull(),
  durationMs: integer('duration_ms'),
  source: text('source'),
  processed: boolean('processed').default(false),
}, (table) => {
  return {
    pk: uniqueIndex('listening_events_unique_idx').on(table.userId, table.spotifyTrackId, table.playedAt),
  };
});

export const dailyUserStats = pgTable('daily_user_stats', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  totalMs: integer('total_ms').notNull().default(0),
  totalPlays: integer('total_plays').notNull().default(0),
  uniqueTracks: integer('unique_tracks').notNull().default(0),
  uniqueArtists: integer('unique_artists').notNull().default(0),
  peakHour: integer('peak_hour'),
}, (table) => {
  return {
    pk: uniqueIndex('daily_user_stats_pk').on(table.userId, table.date),
  };
});

export const dailyTrackStats = pgTable('daily_track_stats', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  spotifyTrackId: text('spotify_track_id').notNull().references(() => tracks.spotifyTrackId),
  playCount: integer('play_count').notNull().default(0),
  msPlayed: integer('ms_played').notNull().default(0),
}, (table) => {
  return {
    pk: uniqueIndex('daily_track_stats_pk').on(table.userId, table.date, table.spotifyTrackId),
  };
});

export const dailyArtistStats = pgTable('daily_artist_stats', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  spotifyArtistId: text('spotify_artist_id').notNull().references(() => artists.spotifyArtistId),
  playCount: integer('play_count').notNull().default(0),
  msPlayed: integer('ms_played').notNull().default(0),
}, (table) => {
  return {
    pk: uniqueIndex('daily_artist_stats_pk').on(table.userId, table.date, table.spotifyArtistId),
  };
});
