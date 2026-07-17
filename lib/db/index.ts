import "@/lib/server/safe-timeout";
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

const connectionString = process.env.POSTGRES_URL!;

// Prevent establishing duplicate connection pools during dev reloads (HMR protection)
declare global {
  var neonPoolClient: Pool | undefined;
}

// Instantiate a single clean, serverless pool connection instance
const pool = globalThis.neonPoolClient || new Pool({
  connectionString,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 10000,
  max: 10, // Max connection capability threshold
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.neonPoolClient = pool;
}

// Pass the schema here to enable the clean relational Query matrix
export const db = drizzle(pool, { schema });