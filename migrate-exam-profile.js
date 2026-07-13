require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function main() {
  console.log("Connecting to DB...");
  const sql = neon(process.env.POSTGRES_URL);
  
  console.log("Executing query...");
  await sql`
    CREATE TABLE IF NOT EXISTS "ExamProfile" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "userId" uuid NOT NULL,
      "targetExam" varchar(100),
      "targetYear" varchar(4),
      "currentClass" varchar(50),
      "targetNlu" varchar(100),
      "weakestSection" varchar(100),
      "xp" integer DEFAULT 0,
      "streak" integer DEFAULT 0,
      "achievementLevel" varchar(100) DEFAULT 'NLU Aspirant',
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "ExamProfile_userId_unique" UNIQUE("userId"),
      CONSTRAINT "ExamProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE no action ON UPDATE no action
    );
  `;
  
  console.log("Table created successfully!");
}

main().catch(console.error);
