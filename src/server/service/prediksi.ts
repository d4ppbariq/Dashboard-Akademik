import "server-only";
import { getPool } from "@/lib/db/connection";

export interface PrediksiBaris {
  id: string;
  siswa_id: string;
  nis: string;
  nama: string;
  nama_kelas: string;
  tahun_lulus: number;
  cakupan: string;
  nama_mapel: string | null;
  semester_asal: number;
  semester_target: number;
  nilai_prediksi: number;
  interval_bawah: number;
  interval_atas: number;
  model_versi: string;
  jenis: string;
  mae_model: number | null;
  mae_b0: number | null;
  n_siswa: number | null;
  n_pasangan: number | null;
  dibuat_pada: string;
}

export interface RingkasanPrediksi {
  totalBaris: number;
  totalSiswa: number;
  totalCakupan: number;
  modelVersi: string;
  jenis: string;
}

export function ringkasPrediksi(rows: PrediksiBaris[]): RingkasanPrediksi {
  return {
    totalBaris: rows.length,
    totalSiswa: new Set(rows.map((row) => row.siswa_id)).size,
    totalCakupan: new Set(rows.map((row) => row.cakupan)).size,
    modelVersi: rows[0]?.model_versi ?? "-",
    jenis: rows[0]?.jenis ?? "-",
  };
}

export async function getPrediksi(): Promise<PrediksiBaris[]> {
  const result = await getPool().query<PrediksiBaris>(`
    SELECT
      p.id,
      p.siswa_id,
      s.nis,
      s.nama,
      k.nama_kelas,
      a.tahun_lulus,
      p.cakupan,
      mp.nama_mapel,
      p.semester_asal,
      p.semester_target,
      p.nilai_prediksi::float8 AS nilai_prediksi,
      p.interval_bawah::float8 AS interval_bawah,
      p.interval_atas::float8 AS interval_atas,
      p.model_versi,
      COALESCE(p.metrik->>'jenis', 'model') AS jenis,
      (p.metrik->>'mae_model')::float8 AS mae_model,
      (p.metrik->>'mae_b0')::float8 AS mae_b0,
      (p.metrik->>'n_siswa')::int AS n_siswa,
      (p.metrik->>'n_pasangan')::int AS n_pasangan,
      p.dibuat_pada::text AS dibuat_pada
    FROM "Prediksi" p
    JOIN "Siswa" s ON s.id = p.siswa_id
    JOIN "Kelas" k ON k.id = s.kelas_id
    JOIN "Angkatan" a ON a.id = k.angkatan_id
    LEFT JOIN "MataPelajaran" mp ON mp.id = p.mata_pelajaran_id
    ORDER BY a.tahun_lulus DESC, k.nama_kelas, s.nama, p.cakupan
  `);

  return result.rows;
}
