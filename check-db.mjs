import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL + "?sslmode=require");

async function main() {
    try {
        console.log("Checking migrations in 'drizzle' schema...");
        const migrations = await sql`
            SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC
        `;
        migrations.forEach(m => console.log(m.id || m.hash || JSON.stringify(m)));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.end();
    }
}

main();
