import "@/lib/server/safe-timeout";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Added this import

// Ensure you add POSTGRES_URL to your Chatbot's .env file!
const connectionString = process.env.POSTGRES_URL!;
const client = postgres(connectionString, { prepare: false });

// Pass the schema here to enable the Relational Query API
export const db = drizzle(client, { schema });
