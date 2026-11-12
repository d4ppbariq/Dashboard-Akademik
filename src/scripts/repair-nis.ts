import { createHash } from "node:crypto";
import { Pool } from "pg";

type Siswa = {
  id: string;
  kelas_id: string;
  nis: string;
  nama: string;
};

type Nilai = {
  id: string;
  siswa_id: string;
  mata_pelajaran_id: string;
  semester: number;
  nilai: number;
};

type Kehadiran = {
  id: string;
  siswa_id: string;
  semester: number;
  sakit: number;
  izin: number;
  tanpa_keterangan: number;
};

type Prediksi = {
  id: string;
  siswa_id: string;
  cakupan: string;
  semester_target: number;
  model_versi: string;
};

type Rencana = {
  base: string;
  canonical: Siswa;
  duplikat: Siswa[];
  nilaiPindah: Nilai[];
  nilaiHapus: Nilai[];
  hadirPindah: Kehadiran[];
  hadirHapus: Kehadiran[];
  prediksiPindah: Prediksi[];
  prediksiHapus: Prediksi[];
  konflik: string[];
};

const APPLY = process.argv.includes("--apply");

function nisDasar(nis: string): string {
  const dot = nis.indexOf(".");
  return dot === -1 ? nis : nis.slice(0, dot);
}

function auditId(seed: string): string {
  return `audit-repair-${createHash("sha1").update(seed).digest("hex").slice(0, 16)}`;
}

function ringkas(rencana: Rencana): string {
  return [
    `NIS dasar ${rencana.base}`,
    `kanonis ${rencana.canonical.nis} (${rencana.canonical.id})`,
    `duplikat ${rencana.duplikat.length}`,
    `nilai pindah=${rencana.nilaiPindah.length} hapus=${rencana.nilaiHapus.length}`,
    `kehadiran pindah=${rencana.hadirPindah.length} hapus=${rencana.hadirHapus.length}`,
    `prediksi pindah=${rencana.prediksiPindah.length} hapus=${rencana.prediksiHapus.length}`,
  ].join(" | ");
}

async function main() {
  process.loadEnvFile(".env");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diset di .env");

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const grup = await client.query<{ nis_base: string; jumlah: number }>(`
      SELECT regexp_replace(nis, '\\..*$', '') AS nis_base, count(*)::int AS jumlah
        FROM "Siswa"
       GROUP BY 1
      HAVING count(*) > 1
       ORDER BY 1
    `);

    if (grup.rows.length === 0) {
      console.log("Tidak ada NIS dasar duplikat. Tidak ada perubahan.");
      await client.query("ROLLBACK");
      return;
    }

    const bases = grup.rows.map((row) => row.nis_base);
    const siswa = await client.query<Siswa>(
      `SELECT id, kelas_id, nis, nama
         FROM "Siswa"
        WHERE regexp_replace(nis, '\\..*$', '') = ANY($1::text[])
        ORDER BY nis`,
      [bases]
    );
    const ids = siswa.rows.map((row) => row.id);

    const nilai = await client.query<Nilai>(
      `SELECT id, siswa_id, mata_pelajaran_id, semester, nilai
         FROM "NilaiSiswa"
        WHERE siswa_id = ANY($1::text[])`,
      [ids]
    );
    const kehadiran = await client.query<Kehadiran>(
      `SELECT id, siswa_id, semester, sakit, izin, tanpa_keterangan
         FROM "KehadiranSiswa"
        WHERE siswa_id = ANY($1::text[])`,
      [ids]
    );
    const adaPrediksi = await client.query<{ ada: boolean }>(
      `SELECT to_regclass('"Prediksi"') IS NOT NULL AS ada`
    );
    const prediksi = adaPrediksi.rows[0]?.ada
      ? await client.query<Prediksi>(
          `SELECT id, siswa_id, cakupan, semester_target, model_versi
             FROM "Prediksi"
            WHERE siswa_id = ANY($1::text[])`,
          [ids]
        )
      : { rows: [] as Prediksi[] };

    const nilaiBySiswa = new Map<string, Nilai[]>();
    for (const row of nilai.rows) {
      const list = nilaiBySiswa.get(row.siswa_id) ?? [];
      list.push(row);
      nilaiBySiswa.set(row.siswa_id, list);
    }
    const hadirBySiswa = new Map<string, Kehadiran[]>();
    for (const row of kehadiran.rows) {
      const list = hadirBySiswa.get(row.siswa_id) ?? [];
      list.push(row);
      hadirBySiswa.set(row.siswa_id, list);
    }
    const prediksiBySiswa = new Map<string, Prediksi[]>();
    for (const row of prediksi.rows) {
      const list = prediksiBySiswa.get(row.siswa_id) ?? [];
      list.push(row);
      prediksiBySiswa.set(row.siswa_id, list);
    }

    const rencana: Rencana[] = [];
    let totalKonflik = 0;

    for (const base of bases) {
      const rows = siswa.rows.filter((row) => nisDasar(row.nis) === base);
      const exact = rows.find((row) => row.nis === base);
      const canonical =
        exact ??
        [...rows].sort((a, b) => {
          const aData =
            (nilaiBySiswa.get(a.id)?.length ?? 0) +
            (hadirBySiswa.get(a.id)?.length ?? 0) +
            (prediksiBySiswa.get(a.id)?.length ?? 0);
          const bData =
            (nilaiBySiswa.get(b.id)?.length ?? 0) +
            (hadirBySiswa.get(b.id)?.length ?? 0) +
            (prediksiBySiswa.get(b.id)?.length ?? 0);
          return bData - aData || a.nis.localeCompare(b.nis);
        })[0];

      const duplikat = rows.filter((row) => row.id !== canonical.id);
      const konflik: string[] = [];
      for (const row of duplikat) {
        if (row.kelas_id !== canonical.kelas_id) {
          konflik.push(
            `Kelas berbeda: ${row.nis} di ${row.kelas_id}, kanonis di ${canonical.kelas_id}`
          );
        }
      }

      const nilaiCanonical = new Map(
        (nilaiBySiswa.get(canonical.id) ?? []).map((row) => [
          `${row.mata_pelajaran_id}|${row.semester}`,
          row,
        ])
      );
      const hadirCanonical = new Map(
        (hadirBySiswa.get(canonical.id) ?? []).map((row) => [row.semester, row])
      );
      const prediksiCanonical = new Map(
        (prediksiBySiswa.get(canonical.id) ?? []).map((row) => [
          `${row.cakupan}|${row.semester_target}|${row.model_versi}`,
          row,
        ])
      );

      const nilaiPindah: Nilai[] = [];
      const nilaiHapus: Nilai[] = [];
      const hadirPindah: Kehadiran[] = [];
      const hadirHapus: Kehadiran[] = [];
      const prediksiPindah: Prediksi[] = [];
      const prediksiHapus: Prediksi[] = [];

      for (const row of duplikat) {
        for (const item of nilaiBySiswa.get(row.id) ?? []) {
          const key = `${item.mata_pelajaran_id}|${item.semester}`;
          const existing = nilaiCanonical.get(key);
          if (existing) {
            if (existing.nilai !== item.nilai) {
              konflik.push(
                `Nilai berbeda ${item.mata_pelajaran_id} semester ${item.semester}: ${existing.nilai} vs ${item.nilai}`
              );
            } else {
              nilaiHapus.push(item);
            }
          } else {
            nilaiPindah.push(item);
            nilaiCanonical.set(key, item);
          }
        }

        for (const item of hadirBySiswa.get(row.id) ?? []) {
          const existing = hadirCanonical.get(item.semester);
          if (existing) {
            const sama =
              existing.sakit === item.sakit &&
              existing.izin === item.izin &&
              existing.tanpa_keterangan === item.tanpa_keterangan;
            if (!sama) {
              konflik.push(
                `Kehadiran berbeda semester ${item.semester}: ` +
                  `${existing.sakit}/${existing.izin}/${existing.tanpa_keterangan} vs ` +
                  `${item.sakit}/${item.izin}/${item.tanpa_keterangan}`
              );
            } else {
              hadirHapus.push(item);
            }
          } else {
            hadirPindah.push(item);
            hadirCanonical.set(item.semester, item);
          }
        }

        for (const item of prediksiBySiswa.get(row.id) ?? []) {
          const key = `${item.cakupan}|${item.semester_target}|${item.model_versi}`;
          if (prediksiCanonical.has(key)) {
            prediksiHapus.push(item);
          } else {
            prediksiPindah.push(item);
            prediksiCanonical.set(key, item);
          }
        }
      }

      totalKonflik += konflik.length;
      rencana.push({
        base,
        canonical,
        duplikat,
        nilaiPindah,
        nilaiHapus,
        hadirPindah,
        hadirHapus,
        prediksiPindah,
        prediksiHapus,
        konflik,
      });
    }

    for (const item of rencana) {
      console.log(ringkas(item));
      for (const konflik of item.konflik) console.log(`  KONFLIK: ${konflik}`);
    }

    if (totalKonflik > 0) {
      console.error(`Ditemukan ${totalKonflik} konflik. Transaksi dibatalkan.`);
      await client.query("ROLLBACK");
      process.exitCode = 1;
      return;
    }

    if (!APPLY) {
      console.log("Dry-run selesai. Tidak ada perubahan. Jalankan dengan --apply untuk menulis.");
      await client.query("ROLLBACK");
      return;
    }

    for (const item of rencana) {
      for (const row of item.nilaiPindah) {
        await client.query(`UPDATE "NilaiSiswa" SET siswa_id = $1 WHERE id = $2`, [
          item.canonical.id,
          row.id,
        ]);
      }
      for (const row of item.nilaiHapus) {
        await client.query(`DELETE FROM "NilaiSiswa" WHERE id = $1`, [row.id]);
      }
      for (const row of item.hadirPindah) {
        await client.query(`UPDATE "KehadiranSiswa" SET siswa_id = $1 WHERE id = $2`, [
          item.canonical.id,
          row.id,
        ]);
      }
      for (const row of item.hadirHapus) {
        await client.query(`DELETE FROM "KehadiranSiswa" WHERE id = $1`, [row.id]);
      }
      for (const row of item.prediksiPindah) {
        await client.query(`UPDATE "Prediksi" SET siswa_id = $1 WHERE id = $2`, [
          item.canonical.id,
          row.id,
        ]);
      }
      for (const row of item.prediksiHapus) {
        await client.query(`DELETE FROM "Prediksi" WHERE id = $1`, [row.id]);
      }

      if (item.canonical.nis !== item.base) {
        await client.query(`UPDATE "Siswa" SET nis = $1 WHERE id = $2`, [
          item.base,
          item.canonical.id,
        ]);
      }
      for (const row of item.duplikat) {
        await client.query(`DELETE FROM "Siswa" WHERE id = $1`, [row.id]);
      }

      const detail =
        `Gabung NIS dasar ${item.base}: ${item.duplikat.length} record duplikat dihapus; ` +
        `nilai dipindah ${item.nilaiPindah.length}, dihapus ${item.nilaiHapus.length}; ` +
        `kehadiran dipindah ${item.hadirPindah.length}, dihapus ${item.hadirHapus.length}; ` +
        `prediksi dipindah ${item.prediksiPindah.length}, dihapus ${item.prediksiHapus.length}`;
      await client.query(
        `INSERT INTO "AuditLog" (id, user_nama, aksi, entitas, detail)
         VALUES ($1, 'system:repair-nis', 'UPDATE', 'siswa', $2)
         ON CONFLICT (id) DO NOTHING`,
        [auditId(item.base), detail]
      );
      console.log(`DITERAPKAN: ${detail}`);
    }

    await client.query("COMMIT");
    console.log("Perbaikan data selesai dan sudah di-commit.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Perbaikan gagal:", error.message);
  process.exit(1);
});
