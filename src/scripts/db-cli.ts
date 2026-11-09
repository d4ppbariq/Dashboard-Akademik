import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { writeDatabase } from "@/lib/db/write";
import { buildPostgresSeed } from "@/lib/db/seed-postgres";

const ROOT = process.cwd();
const SCHEMA_PATH = resolve(ROOT, "src/lib/db/schema.sql");
const MIGRATIONS_DIR = resolve(ROOT, "src/lib/db/migrations");

function loadEnv(): void {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) {
    console.error("File .env tidak ditemukan. Salin dari .env.example terlebih dahulu.");
    process.exit(1);
  }
  if (typeof process.loadEnvFile !== "function") {
    console.error(
      "Node.js terlalu lama. process.loadEnvFile membutuhkan Node.js 20.12+ (disarankan 22 LTS)."
    );
    process.exit(1);
  }
  process.loadEnvFile(envPath);
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL belum diset di .env");
    process.exit(1);
  }
  return new Pool({ connectionString: url });
}

async function applySchema(pool: Pool): Promise<void> {
  const sql = await readFile(SCHEMA_PATH, "utf-8");
  await pool.query(sql);
  console.log("Schema dasar berhasil diterapkan.");
}

async function seedDatabase(pool: Pool): Promise<void> {
  await writeDatabase(pool, buildPostgresSeed());
  console.log("Seed berhasil: RBAC + mapel default, data akademik kosong.");
  console.log("Password akun awal diambil dari SEED_* di .env, tidak dicetak di sini.");
}

async function migrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigrations(pool: Pool): Promise<void> {
  const files = await migrationFiles();
  if (files.length === 0) {
    console.log("Tidak ada file migrasi.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const file of files) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
      await client.query(sql);
      console.log(`Migrasi ${file} berhasil.`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function hasExistingSchema(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'Role'
     ) AS exists`
  );
  return result.rows[0]?.exists ?? false;
}

async function runSetup(): Promise<void> {
  loadEnv();
  const pool = getPool();
  try {
    if (await hasExistingSchema(pool)) {
      console.error(
        'Setup dibatalkan: tabel "Role" sudah ada. `db:setup` hanya untuk database kosong.'
      );
      console.error(
        "Untuk database yang sudah ada, jalankan migrasi manual dari src/lib/db/migrations/."
      );
      process.exitCode = 1;
      return;
    }

    await applySchema(pool);
    await seedDatabase(pool);
    await applyMigrations(pool);
    console.log("Setup database selesai. Jalankan `npm run dev`.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gagal setup database:", msg);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

async function runMigrate(): Promise<void> {
  loadEnv();
  const pool = getPool();
  try {
    await applySchema(pool);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already exists")) {
      console.warn(
        "Schema sudah ada. Gunakan `npm run db:setup` untuk database kosong atau jalankan migrasi manual."
      );
    } else {
      console.error("Gagal menerapkan schema:", msg);
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

async function runSeed(): Promise<void> {
  loadEnv();
  const pool = getPool();
  try {
    await seedDatabase(pool);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gagal seed:", msg);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const command = process.argv[2];

if (command === "setup") {
  runSetup();
} else if (command === "migrate") {
  runMigrate();
} else if (command === "seed") {
  runSeed();
} else {
  console.log("Usage: npm run db:setup | npm run db:migrate | npm run db:seed");
  process.exit(1);
}
