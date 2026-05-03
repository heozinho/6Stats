import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let queryClient: postgres.Sql | null = null;

export const getDb = (databaseUrl: string) => {
  if (!queryClient) {
    queryClient = postgres(databaseUrl);
  }
  return drizzle(queryClient, { schema });
};
