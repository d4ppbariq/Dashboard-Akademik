"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb, persist, newId } from "@/lib/db/store";
import { pushAudit } from "@/lib/audit";

export type ImportKind = "siswa" | "nilai" | "kehadiran";

export interface ImportRow {
  [key: string]: unknown;
}

export interface ImportError {
  baris: number;
  pesan: string;
}

export interface ImportResult {
  ok: boolean;
  diterima: number;
  ditolak: number;
  errors: ImportError[];
  pesan?: string;
}

const SEMESTER_MAX = 6;

function rowError(baris: number, pesan: string): ImportError {
  return { baris, pesan };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

async function guard(): Promise<{ user: Awaited<ReturnType<typeof requireAuth>>; ok: boolean }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "import.execute"))) {
    return { user, ok: false };
  }
  return { user, ok: true };
}

export async function validateImport(
  kind: ImportKind,
  rows: ImportRow[]
): Promise<ImportResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, diterima: 0, ditolak: rows.length, errors: [], pesan: "Tidak memiliki izin impor" };

  const db = await getDb();
  const errors: ImportError[] = [];

  if (kind === "siswa") {
    const seenNis = new Set<string>();
    const existingNis = new Set(db.siswa.map((s) => s.nis));
    const kelasByKey = new Map(db.kelas.map((k) => [`${k.angkatan_id}-${k.nama_kelas}`, k.id]));

    rows.forEach((r, i) => {
      const baris = i + 2;
      const nis = str(r.NIS);
      if (!nis) return errors.push(rowError(baris, "NIS kosong"));
      if (seenNis.has(nis)) return errors.push(rowError(baris, `NIS ${nis} duplikat dalam file`));
      if (existingNis.has(nis)) return errors.push(rowError(baris, `NIS ${nis} sudah terdaftar`));
      seenNis.add(nis);

      if (!str(r.NAMA)) return errors.push(rowError(baris, "Nama kosong"));
      const jk = str(r.JENIS_KELAMIN).toUpperCase();
      if (jk !== "L" && jk !== "P") return errors.push(rowError(baris, "JENIS_KELAMIN harus L atau P"));

      const angkatanId = str(r.ANGKATAN_ID);
      const kelas = str(r.KELAS).toUpperCase();
      if (!angkatanId || !kelas) return errors.push(rowError(baris, "ANGKATAN_ID dan KELAS wajib diisi"));
      if (!kelasByKey.has(`${angkatanId}-${kelas}`)) {
        return errors.push(rowError(baris, `Kelas ${kelas} tidak ditemukan pada angkatan tersebut`));
      }
    });
  }

  if (kind === "nilai") {
    const existing = new Set(db.siswa.map((s) => s.nis));
    const mapelByKode = new Map(db.mata_pelajaran.map((m) => [m.kode, m.id]));
    const seen = new Set<string>();

    rows.forEach((r, i) => {
      const baris = i + 2;
      const nis = str(r.NIS);
      if (!existing.has(nis)) return errors.push(rowError(baris, `NIS ${nis || "(kosong)"} tidak terdaftar`));
      const kode = str(r.KODE_MAPEL).toUpperCase();
      if (!mapelByKode.has(kode)) return errors.push(rowError(baris, `Kode mapel ${kode} tidak dikenal`));
      const smt = num(r.SEMESTER);
      if (smt === null || smt < 1 || smt > SEMESTER_MAX) return errors.push(rowError(baris, "SEMESTER harus 1-6"));
      const nilai = num(r.NILAI);
      if (nilai === null || nilai < 0 || nilai > 100) return errors.push(rowError(baris, "NILAI harus 0-100"));
      const key = `${nis}-${kode}-${smt}`;
      if (seen.has(key)) return errors.push(rowError(baris, `Duplikat nilai ${kode} sem ${smt} untuk NIS ${nis}`));
      seen.add(key);
    });
  }

  if (kind === "kehadiran") {
    const existing = new Set(db.siswa.map((s) => s.nis));
    const seen = new Set<string>();
    rows.forEach((r, i) => {
      const baris = i + 2;
      const nis = str(r.NIS);
      if (!existing.has(nis)) return errors.push(rowError(baris, `NIS ${nis || "(kosong)"} tidak terdaftar`));
      const smt = num(r.SEMESTER);
      if (smt === null || smt < 1 || smt > SEMESTER_MAX) return errors.push(rowError(baris, "SEMESTER harus 1-6"));
      for (const key of ["SAKIT", "IZIN", "ALPA"]) {
        const v = num(r[key]);
        if (v === null || v < 0) return errors.push(rowError(baris, `${key} harus angka >= 0`));
      }
      const dk = `${nis}-${smt}`;
      if (seen.has(dk)) return errors.push(rowError(baris, `Duplikat kehadiran sem ${smt} untuk NIS ${nis}`));
      seen.add(dk);
    });
  }

  const ditolak = errors.length;
  return { ok: ditolak === 0, diterima: rows.length - ditolak, ditolak, errors };
}

export async function applyImport(kind: ImportKind, rows: ImportRow[]): Promise<ImportResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, diterima: 0, ditolak: rows.length, errors: [], pesan: "Tidak memiliki izin impor" };

  const db = await getDb();
  let diterima = 0;

  if (kind === "siswa") {
    const kelasByKey = new Map(db.kelas.map((k) => [`${k.angkatan_id}-${k.nama_kelas}`, k.id]));
    for (const r of rows) {
      const nis = str(r.NIS);
      if (db.siswa.some((s) => s.nis === nis)) continue;
      const kelasId = kelasByKey.get(`${str(r.ANGKATAN_ID)}-${str(r.KELAS).toUpperCase()}`);
      if (!kelasId) continue;
      db.siswa.push({
        id: newId("s", db.siswa),
        kelas_id: kelasId,
        nis,
        nama: str(r.NAMA),
        jenis_kelamin: str(r.JENIS_KELAMIN).toUpperCase() === "P" ? "P" : "L",
        status_aktif: "AKTIF",
      });
      diterima += 1;
    }
  }

  if (kind === "nilai") {
    const mapelByKode = new Map(db.mata_pelajaran.map((m) => [m.kode, m.id]));
    for (const r of rows) {
      const nis = str(r.NIS);
      const siswa = db.siswa.find((s) => s.nis === nis);
      const mapelId = mapelByKode.get(str(r.KODE_MAPEL).toUpperCase());
      const smt = num(r.SEMESTER);
      const nilai = num(r.NILAI);
      if (!siswa || !mapelId || smt === null || nilai === null) continue;
      db.nilai_siswa = db.nilai_siswa.filter(
        (n) => !(n.siswa_id === siswa.id && n.mata_pelajaran_id === mapelId && n.semester === smt)
      );
      db.nilai_siswa.push({
        id: newId("n", db.nilai_siswa),
        siswa_id: siswa.id,
        mata_pelajaran_id: mapelId,
        semester: smt,
        nilai: Math.round(nilai),
      });
      diterima += 1;
    }
  }

  if (kind === "kehadiran") {
    for (const r of rows) {
      const nis = str(r.NIS);
      const siswa = db.siswa.find((s) => s.nis === nis);
      const smt = num(r.SEMESTER);
      const sakit = num(r.SAKIT) ?? 0;
      const izin = num(r.IZIN) ?? 0;
      const alpa = num(r.ALPA) ?? 0;
      if (!siswa || smt === null) continue;
      db.kehadiran_siswa = db.kehadiran_siswa.filter(
        (k) => !(k.siswa_id === siswa.id && k.semester === smt)
      );
      db.kehadiran_siswa.push({
        id: newId("k", db.kehadiran_siswa),
        siswa_id: siswa.id,
        semester: smt,
        sakit,
        izin,
        tanpa_keterangan: alpa,
      });
      diterima += 1;
    }
  }

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "IMPORT",
    entitas: kind,
    detail: `Impor data ${kind}: ${diterima} baris berhasil diproses`,
  });
  await persist();

  revalidatePath("/dashboard");
  revalidatePath("/kelas");
  revalidatePath("/siswa");
  revalidatePath("/akademik");

  return { ok: true, diterima, ditolak: rows.length - diterima, errors: [] };
}
