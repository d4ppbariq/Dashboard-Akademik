import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "ml", "data", "raw");

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(columns, rows) {
  const header = columns.join(",");
  const body = rows
    .map((row) => columns.map((column) => csvCell(row[column])).join(","))
    .join("\n");
  return `${header}\n${body}${body ? "\n" : ""}`;
}

const QUERIES = {
  angkatan: {
    columns: ["angkatan_id", "tahun_lulus"],
    sql: `
      SELECT a.id AS angkatan_id, a.tahun_lulus
      FROM "Angkatan" a
      ORDER BY a.tahun_lulus, a.id
    `,
  },
  kelas: {
    columns: ["kelas_id", "angkatan_id", "nama_kelas"],
    sql: `
      SELECT k.id AS kelas_id, k.angkatan_id, k.nama_kelas
      FROM "Kelas" k
      ORDER BY k.angkatan_id, k.nama_kelas, k.id
    `,
  },
  siswa: {
    columns: ["siswa_id", "kelas_id", "nis", "nama", "jenis_kelamin"],
    sql: `
      SELECT s.id AS siswa_id, s.kelas_id, s.nis, s.nama, s.jenis_kelamin
      FROM "Siswa" s
      ORDER BY s.nis, s.id
    `,
  },
  mapel: {
    columns: ["mapel_id", "kode", "nama_mapel", "urutan"],
    sql: `
      SELECT m.id AS mapel_id, m.kode, m.nama_mapel, m.urutan
      FROM "MataPelajaran" m
      ORDER BY m.urutan, m.kode
    `,
  },
  nilai: {
    columns: ["siswa_id", "mapel_id", "semester", "nilai"],
    sql: `
      SELECT n.siswa_id, n.mata_pelajaran_id AS mapel_id, n.semester, n.nilai
      FROM "NilaiSiswa" n
      ORDER BY n.siswa_id, n.semester, n.mata_pelajaran_id
    `,
  },
  kehadiran: {
    columns: ["siswa_id", "semester", "sakit", "izin", "tanpa_keterangan"],
    sql: `
      SELECT k.siswa_id, k.semester, k.sakit, k.izin, k.tanpa_keterangan
      FROM "KehadiranSiswa" k
      ORDER BY k.siswa_id, k.semester
    `,
  },
};

async function main() {
  loadEnv();

  const url = process.env.ML_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "ML_DATABASE_URL (atau DATABASE_URL untuk ekstraksi lokal) belum diset di .env"
    );
  }

  await mkdir(OUT_DIR, { recursive: true });
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    // Ekstraksi tidak boleh menulis, bahkan bila memakai kredensial aplikasi.
    await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");

    const counts = {};
    for (const [name, query] of Object.entries(QUERIES)) {
      const result = await client.query(query.sql);
      await writeFile(
        join(OUT_DIR, `${name}.csv`),
        writeCsv(query.columns, result.rows),
        "utf8"
      );
      counts[name] = result.rowCount;
    }

    const metadata = {
      sumber_koneksi:
        process.env.ML_DATABASE_URL === undefined
          ? "DATABASE_URL (sesi read-only)"
          : "ML_DATABASE_URL",
      read_only: true,
      diekstrak_pada: new Date().toISOString(),
      jumlah_baris: counts,
    };
    await writeFile(
      join(OUT_DIR, "metadata.json"),
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8"
    );

    console.log("Ekstraksi selesai (read-only):", counts);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Ekstraksi gagal:", error.message);
  process.exitCode = 1;
});
