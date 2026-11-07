// Kjøres ved oppstart av app-containeren (bundlet til dist/migrate.cjs med esbuild).
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL mangler");
  const pool = new Pool({ connectionString: url });
  const folder = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle");

  // Postgres kan bruke litt tid på å bli klar selv etter healthcheck; prøv noen ganger
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("select 1");
      break;
    } catch (err) {
      if (attempt >= 15) throw err;
      console.log(`Venter på databasen (forsøk ${attempt}) ...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  await migrate(drizzle(pool), { migrationsFolder: folder });
  console.log("Migrasjoner kjørt");
  await pool.end();
}

main().catch((err) => {
  console.error("Migrering feilet:", err);
  process.exit(1);
});
