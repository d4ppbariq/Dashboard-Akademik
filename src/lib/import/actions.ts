"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb, persist, createIdAllocator } from "@/lib/db/store";
import { pushAudit } from "@/lib/audit";
import type { Database } from "@/lib/db/types";
import { applyRows } from "@/lib/import/apply";
import {
  validateRows,
  type ImportError,
  type ImportRow,
  type ImportWarning,
  type ColumnReport,
  type SiswaRow,
} from "@/lib/import/validate";

export type { ImportError, ImportRow, ImportWarning };

export interface ImportResult {
  ok: boolean;
  diterima: number;
  ditolak: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  columns?: ColumnReport[];
  pesan?: string;
}

async function guard(): Promise<{ user: Awaited<ReturnType<typeof requireAuth>>; ok: boolean }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "import.execute"))) {
    return { user, ok: false };
  }
  return { user, ok: true };
}

function siswaByNis(db: Database): Map<string, SiswaRow> {
  const map = new Map<string, SiswaRow>();
  for (const s of db.siswa) {
    map.set(s.nis, { id: s.id, kelas_id: s.kelas_id, nis: s.nis, nama: s.nama, jenis_kelamin: s.jenis_kelamin });
  }
  return map;
}

const kosong = (rows: ImportRow[], pesan?: string): ImportResult => ({
  ok: false,
  diterima: 0,
  ditolak: rows.length,
  errors: [],
  warnings: [],
  pesan,
});

export async function validateImportFlat(
  rows: ImportRow[],
  angkatanId: string,
  kelasId: string
): Promise<ImportResult> {
  const g = await guard();
  if (!g.ok) return kosong(rows, "Tidak memiliki izin impor");

  const db = await getDb();
  const kelas = db.kelas.find((k) => k.id === kelasId);
  if (!kelas) return kosong(rows, "Kelas tidak valid");
  // Versi lama hanya memvalidasi kelas, sehingga angkatan yang salah tetap
  // diterima dan tahun lulus salah tercatat di audit log.
  if (kelas.angkatan_id !== angkatanId) return kosong(rows, "Kelas bukan bagian dari angkatan tersebut");

  const result = validateRows(rows, {
    mapelDb: db.mata_pelajaran,
    siswaByNis: siswaByNis(db),
    angkatanId,
    kelasId,
  });

  return {
    ok: result.ok,
    diterima: result.diterima,
    ditolak: result.ditolak,
    errors: result.errors,
    warnings: result.warnings,
    columns: result.columns,
  };
}


export async function applyImportFlat(
  rows: ImportRow[],
  angkatanId: string,
  kelasId: string
): Promise<ImportResult> {
  const g = await guard();
  if (!g.ok) return kosong(rows, "Tidak memiliki izin impor");

  const db = await getDb();
  const kelas = db.kelas.find((k) => k.id === kelasId);
  if (!kelas) return kosong(rows, "Kelas tidak valid");
  if (kelas.angkatan_id !== angkatanId) return kosong(rows, "Kelas bukan bagian dari angkatan tersebut");

  const result = validateRows(rows, {
    mapelDb: db.mata_pelajaran,
    siswaByNis: siswaByNis(db),
    angkatanId,
    kelasId,
  });

  // All-or-nothing: satu baris cacat berarti tidak ada yang ditulis sama sekali.
  if (!result.ok) {
    return {
      ok: false,
      diterima: 0,
      ditolak: result.ditolak,
      errors: result.errors,
      warnings: result.warnings,
      columns: result.columns,
      pesan: "Impor dibatalkan karena ada baris yang tidak valid; tidak ada data yang ditulis",
    };
  }

  // Menjalankan persist() berarti TRUNCATE + tulis ulang seluruh tabel, jadi
  // file kosong tidak boleh memicu penulisan apa pun.
  if (result.rows.length === 0) {
    return {
      ok: true,
      diterima: 0,
      ditolak: 0,
      errors: [],
      warnings: result.warnings,
      columns: result.columns,
      pesan: "Tidak ada baris untuk diproses; tidak ada perubahan data",
    };
  }

  applyRows(db, result.rows, kelasId, createIdAllocator(db));

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "IMPORT",
    entitas: "gabungan",
    detail: `Import ${kelas.nama_kelas} (${db.angkatan.find((a) => a.id === angkatanId)?.tahun_lulus ?? angkatanId}): ${result.diterima} baris diproses${result.hasAttendanceSection ? "" : " (tanpa kolom kehadiran)"}`,
  });
  await persist(db);

  revalidatePath("/dashboard");
  revalidatePath("/kelas");
  revalidatePath("/siswa");
  revalidatePath("/akademik");

  return {
    ok: true,
    diterima: result.diterima,
    ditolak: 0,
    errors: [],
    warnings: result.warnings,
    columns: result.columns,
  };
}
