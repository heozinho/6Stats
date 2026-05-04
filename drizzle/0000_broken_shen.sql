CREATE TABLE "artists" (
	"spotify_artist_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"genres" text[],
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "daily_artist_stats" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"spotify_artist_id" text NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"ms_played" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_track_stats" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"spotify_track_id" text NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"ms_played" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_user_stats" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"total_ms" integer DEFAULT 0 NOT NULL,
	"total_plays" integer DEFAULT 0 NOT NULL,
	"unique_tracks" integer DEFAULT 0 NOT NULL,
	"unique_artists" integer DEFAULT 0 NOT NULL,
	"peak_hour" integer
);
--> statement-breakpoint
CREATE TABLE "listening_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"spotify_track_id" text NOT NULL,
	"played_at" timestamp NOT NULL,
	"duration_ms" integer,
	"source" text,
	"processed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "spotify_tokens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"spotify_track_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"artist_id" text,
	"album_id" text,
	"duration_ms" integer NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"spotify_user_id" text NOT NULL,
	"display_name" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_spotify_user_id_unique" UNIQUE("spotify_user_id")
);
--> statement-breakpoint
ALTER TABLE "daily_artist_stats" ADD CONSTRAINT "daily_artist_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_artist_stats" ADD CONSTRAINT "daily_artist_stats_spotify_artist_id_artists_spotify_artist_id_fk" FOREIGN KEY ("spotify_artist_id") REFERENCES "public"."artists"("spotify_artist_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_track_stats" ADD CONSTRAINT "daily_track_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_track_stats" ADD CONSTRAINT "daily_track_stats_spotify_track_id_tracks_spotify_track_id_fk" FOREIGN KEY ("spotify_track_id") REFERENCES "public"."tracks"("spotify_track_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_user_stats" ADD CONSTRAINT "daily_user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_events" ADD CONSTRAINT "listening_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_events" ADD CONSTRAINT "listening_events_spotify_track_id_tracks_spotify_track_id_fk" FOREIGN KEY ("spotify_track_id") REFERENCES "public"."tracks"("spotify_track_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spotify_tokens" ADD CONSTRAINT "spotify_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_artist_stats_pk" ON "daily_artist_stats" USING btree ("user_id","date","spotify_artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_track_stats_pk" ON "daily_track_stats" USING btree ("user_id","date","spotify_track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_user_stats_pk" ON "daily_user_stats" USING btree ("user_id","date");