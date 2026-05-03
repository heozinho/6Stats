export type Bindings = {
  DATABASE_URL: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  JWT_SECRET: string;
  APP_URL: string;
  ARCHIVE_BUCKET: R2Bucket;
};

export type Variables = {
  userId: string; // Set by auth middleware
};
