import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL);

try {
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "miniTokensUsed" varchar(50) DEFAULT '0'`;
    console.log('✅ miniTokensUsed added');
} catch (e) { console.log('miniTokensUsed:', e.message); }

try {
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "macroTokensUsed" varchar(50) DEFAULT '0'`;
    console.log('✅ macroTokensUsed added');
} catch (e) { console.log('macroTokensUsed:', e.message); }

try {
    await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxTokensUsed" varchar(50) DEFAULT '0'`;
    console.log('✅ maxTokensUsed added');
} catch (e) { console.log('maxTokensUsed:', e.message); }

// Verify
const cols = await sql`
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'User' AND column_name LIKE '%oken%'
`;
console.log('Token columns in DB:', cols.map(c => c.column_name).join(', '));
