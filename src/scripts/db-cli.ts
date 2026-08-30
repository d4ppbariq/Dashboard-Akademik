import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { writeDatabase } from "@/lib/db/write";
import { buildPostgresSeed } from "@/lib/db/seed-postgres";

const ROOT = process.cwd();

function loadEnv(): void {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) {
    console.error("File .env tidak ditemukan. Salin dari .env.example terlebih dahulu.");
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

async function runMigrate(): Promise<void> {
  loadEnv();
  const pool = getPool();
  const schemaPath = resolve(ROOT, "src/lib/db/schema.sql");
  const sql = await readFile(schemaPath, "utf-8");
  try {
    await pool.query(sql);
    console.log("✅ Schema berhasil diterapkan (15 tabel).");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already exists")) {
      console.warn("⚠️ Schema sudah ada. Gunakan 'npm run db:reset' bila ingin setup dari nol.");
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
    await writeDatabase(pool, buildPostgresSeed());
    console.log("✅ Seed berhasil: RBAC + 11 mapel default, data akademik kosong.");
    console.log("   Login superadmin: superadmin@nesaciba.sch.id / 26adm0828");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gagal seed:", msg);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const command = process.argv[2];

if (command === "migrate") {
  runMigrate();
} else if (command === "seed") {
  runSeed();
} else {
  console.log("Usage: npm run db:migrate | npm run db:seed");
  process.exit(1);
}
