import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = 'postgresql://postgres.eosghccvgazzqoazbnjd:Welovepurple12%3F@aws-1-eu-west-2.pooler.supabase.com:6543/postgres';
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log('Creating api_keys table...');
  await client`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      name TEXT DEFAULT 'Muzeebra Client',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  console.log('Table api_keys created successfully.');
  process.exit(0);
}

main().catch(console.error);
