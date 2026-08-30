import "server-only";
import { Pool } from "pg";

const globalForPool = globalThis as unknown as {
  nesacibaPool?: Pool;
};

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL tidak terkonfigurasi. Tambahkan ke file .env (lihat .env.example)."
    );
  }
  return new Pool({ connectionString: url });
}

export function getPool(): Pool {
  if (!globalForPool.nesacibaPool) {
    globalForPool.nesacibaPool = createPool();
  }
  return globalForPool.nesacibaPool;
}
