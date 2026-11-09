import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { Pool } from "pg";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "ml", "artefak");

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });
}

async function main() {
  loadEnv();

  const b2Mode = process.argv.includes("--b2");
  const metrics = JSON.parse(
    await readFile(
      join(ARTIFACT_DIR, b2Mode ? "b2_metrics.json" : "metrics.json"),
      "utf8"
    )
  );
  const versi = JSON.parse(
    await readFile(
      join(ARTIFACT_DIR, b2Mode ? "b2_versi.json" : "versi.json"),
      "utf8"
    )
  );
  const published = new Set(versi.published_targets ?? []);

  if (!metrics.gate?.mean_passed || published.size === 0) {
    console.log(
      "Tidak ada target yang lulus gate penerbitan. Tabel Prediksi tidak diubah."
    );
    return;
  }

  const csvPath = join(ARTIFACT_DIR, "prediksi_terbaru.csv");
  if (!existsSync(csvPath)) {
    throw new Error("prediksi_terbaru.csv belum ada. Jalankan `python -m ml.predict`.");
  }

  const rows = parseCsv(await readFile(csvPath, "utf8")).filter(
    (row) => row.boleh_terbit === "1" && published.has(row.cakupan)
  );
  if (rows.length === 0) {
    console.log("Tidak ada baris prediksi yang boleh diterbitkan.");
    return;
  }

  const url = process.env.POST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("POST_DATABASE_URL (atau DATABASE_URL) belum diset di .env");
  }

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const semesterAsal = Number(row.semester_asal);
      const semesterTarget = Number(row.semester_target);
      const key = `${row.model_versi}|${row.siswa_id}|${row.cakupan}|${semesterTarget}`;
      const id = `pred-${createHash("sha1").update(key).digest("hex")}`;
      const metrik = JSON.stringify({
        jenis: row.jenis || (b2Mode ? "rule-engine" : "model"),
        sigma: Number(row.sigma),
        mae_model: Number(row.mae_model),
        mae_b0: Number(row.mae_b0),
        n_siswa: Number(row.n_siswa),
        n_pasangan: Number(row.n_pasangan),
      });

      await client.query(
        `
        INSERT INTO "Prediksi" (
          id, skenario, level, siswa_id, mata_pelajaran_id, cakupan,
          semester_asal, semester_target, horizon,
          nilai_prediksi, interval_bawah, interval_atas,
          model_versi, metrik
        ) VALUES (
          $1, 'A1', 'siswa', $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10,
          $11, $12::jsonb
        )
        ON CONFLICT (siswa_id, cakupan, semester_target, model_versi)
        DO UPDATE SET
          nilai_prediksi = EXCLUDED.nilai_prediksi,
          interval_bawah = EXCLUDED.interval_bawah,
          interval_atas = EXCLUDED.interval_atas,
          metrik = EXCLUDED.metrik,
          dibuat_pada = now()
        `,
        [
          id,
          row.siswa_id,
          row.mata_pelajaran_id || null,
          row.cakupan,
          semesterAsal,
          semesterTarget,
          semesterTarget - semesterAsal,
          Number(row.nilai_prediksi),
          Number(row.interval_bawah),
          Number(row.interval_atas),
          row.model_versi,
          metrik,
        ]
      );
    }
    await client.query("COMMIT");
    console.log(`Diterbitkan ${rows.length} baris ke tabel Prediksi.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Penerbitan gagal:", error.message);
  process.exitCode = 1;
});
