"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb, persist, newId } from "@/lib/db/store";
import { pushAudit } from "@/lib/audit";
import type { Database } from "@/lib/db/types";

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

function buildMapelIndex(db: Database) {
  return new Map(db.mata_pelajaran.map((m) => [m.nama_mapel.toLowerCase(), m]));
}

function extractSemester(r: ImportRow): number | null {
  return num(r.Semester ?? r.SEMESTER);
}

function extractAttendance(r: ImportRow) {
  return {
    sakit: num(r.Sakit ?? r.SAKIT) ?? 0,
    izin: num(r.Izin ?? r.IZIN) ?? 0,
    tanpaKeterangan: num(r["Tanpa Keterangan"] ?? r.TANPA_KETERANGAN ?? r.ALPA) ?? 0,
  };
}

function extractGrades(r: ImportRow, mapelIndex: Map<string, { id: string; kode: string }>) {
  const grades: { mapelId: string; kode: string; nilai: number }[] = [];
  for (const [key, val] of Object.entries(r)) {
    if (["NIS", "Nama", "Jenis Kelamin", "Semester", "Sakit", "Izin", "Tanpa Keterangan"].includes(key)) continue;
    const n = num(val);
    if (n === null || n < 0 || n > 100) continue;
    const mapel = mapelIndex.get(key.toLowerCase());
    if (mapel) {
      grades.push({ mapelId: mapel.id, kode: mapel.kode, nilai: Math.round(n) });
    }
  }
  return grades;
}

async function guard(): Promise<{ user: Awaited<ReturnType<typeof requireAuth>>; ok: boolean }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "import.execute"))) {
    return { user, ok: false };
  }
  return { user, ok: true };
}

export async function validateImportFlat(
  rows: ImportRow[],
  angkatanId: string,
  kelasId: string
): Promise<ImportResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, diterima: 0, ditolak: rows.length, errors: [], pesan: "Tidak memiliki izin impor" };

  const db = await getDb();
  const mapelIndex = buildMapelIndex(db);
  const kelasExists = db.kelas.some((k) => k.id === kelasId && k.angkatan_id === angkatanId);
  if (!kelasExists) {
    return { ok: false, diterima: 0, ditolak: rows.length, errors: [], pesan: "Kelas atau angkatan tidak valid" };
  }

  const errors: ImportError[] = [];
  const existingNis = new Set(
    db.siswa.filter((s) => s.kelas_id === kelasId).map((s) => s.nis)
  );
  const seenNis = new Set<string>();
  const seenNisSemester = new Set<string>();

  rows.forEach((r, i) => {
    const baris = i + 2;
    const nis = str(r.NIS);
    if (!nis) return errors.push(rowError(baris, "NIS kosong"));
    if (!str(r.Nama ?? r.NAMA)) return errors.push(rowError(baris, "Nama kosong"));

    const jk = str(r["Jenis Kelamin"] ?? r.JENIS_KELAMIN).toUpperCase();
    if (jk !== "L" && jk !== "P") return errors.push(rowError(baris, "Jenis Kelamin harus L atau P"));

    const smt = extractSemester(r);
    if (smt === null || smt < 1 || smt > SEMESTER_MAX) return errors.push(rowError(baris, "Semester harus 1-6"));

    if (!seenNis.has(nis)) {
      if (existingNis.has(nis)) return errors.push(rowError(baris, `NIS ${nis} sudah terdaftar di kelas ini`));
    }
    seenNis.add(nis);

    const nsKey = `${nis}-${smt}`;
    if (seenNisSemester.has(nsKey)) return errors.push(rowError(baris, `Duplikat NIS ${nis} semester ${smt}`));
    seenNisSemester.add(nsKey);

    const att = extractAttendance(r);
    if (att.sakit < 0 || att.izin < 0 || att.tanpaKeterangan < 0) {
      return errors.push(rowError(baris, "Sakit/Izin/Tanpa Keterangan harus >= 0"));
    }

    const grades = extractGrades(r, mapelIndex);
    for (const g of grades) {
      if (g.nilai < 0 || g.nilai > 100) {
        return errors.push(rowError(baris, `Nilai ${g.kode} harus 0-100`));
      }
    }
  });

  const ditolak = errors.length;
  return { ok: ditolak === 0, diterima: rows.length - ditolak, ditolak, errors };
}

export async function applyImportFlat(
  rows: ImportRow[],
  angkatanId: string,
  kelasId: string
): Promise<ImportResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, diterima: 0, ditolak: rows.length, errors: [], pesan: "Tidak memiliki izin impor" };

  const db = await getDb();
  const mapelIndex = buildMapelIndex(db);
  const kelas = db.kelas.find((k) => k.id === kelasId);
  if (!kelas) return { ok: false, diterima: 0, ditolak: rows.length, errors: [], pesan: "Kelas tidak valid" };

  let diterima = 0;

  for (const r of rows) {
    const nis = str(r.NIS);
    const nama = str(r.Nama ?? r.NAMA);
    const jk = (str(r["Jenis Kelamin"] ?? r.JENIS_KELAMIN).toUpperCase() === "P" ? "P" : "L") as "L" | "P";
    const smt = extractSemester(r);
    if (!nis || !nama || smt === null) continue;

    let siswa = db.siswa.find((s) => s.nis === nis);
    if (!siswa) {
      const id = newId("s", db.siswa);
      siswa = { id, kelas_id: kelasId, nis, nama, jenis_kelamin: jk, status_aktif: "AKTIF" };
      db.siswa.push(siswa);
    }

    const att = extractAttendance(r);
    db.kehadiran_siswa = db.kehadiran_siswa.filter(
      (k) => !(k.siswa_id === siswa!.id && k.semester === smt)
    );
    db.kehadiran_siswa.push({
      id: newId("k", db.kehadiran_siswa),
      siswa_id: siswa.id,
      semester: smt,
      sakit: att.sakit,
      izin: att.izin,
      tanpa_keterangan: att.tanpaKeterangan,
    });

    const grades = extractGrades(r, mapelIndex);
    for (const g of grades) {
      db.nilai_siswa = db.nilai_siswa.filter(
        (n) => !(n.siswa_id === siswa!.id && n.mata_pelajaran_id === g.mapelId && n.semester === smt)
      );
      db.nilai_siswa.push({
        id: newId("n", db.nilai_siswa),
        siswa_id: siswa.id,
        mata_pelajaran_id: g.mapelId,
        semester: smt,
        nilai: g.nilai,
      });
    }

    diterima += 1;
  }

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "IMPORT",
    entitas: "gabungan",
    detail: `Import ${kelas.nama_kelas} (${db.angkatan.find((a) => a.id === angkatanId)?.tahun_lulus ?? angkatanId}): ${diterima} baris diproses`,
  });
  await persist();

  revalidatePath("/dashboard");
  revalidatePath("/kelas");
  revalidatePath("/siswa");
  revalidatePath("/akademik");

  return { ok: true, diterima, ditolak: rows.length - diterima, errors: [] };
}
