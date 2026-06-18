import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const getDb = (databaseUrl: string) => {
  // Create a fresh client per request — required for Cloudflare Workers.
  // prepare: false is required for Supabase's pgbouncer pooler (transaction mode)
  // which does not support named prepared statements.
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  return drizzle(client, { schema });
};
