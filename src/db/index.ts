import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const getDb = (databaseUrl: string) => {
  // Create a fresh client per request — required for Cloudflare Workers.
  // Workers isolate I/O per request context; sharing a singleton connection
  // across requests causes "Cannot perform I/O on behalf of a different request".
  const client = postgres(databaseUrl, { max: 1 });
  return drizzle(client, { schema });
};
