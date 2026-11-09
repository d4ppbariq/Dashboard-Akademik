/**
 * Validasi impor nilai — satu-satunya sumber kebenaran.
 *
 * Modul murni (tanpa I/O, tanpa "use server") supaya bisa diuji tanpa database.
 * `actions.ts` hanya merakit konteks dari database lalu memanggil `validateRows`,
 * dan `applyImportFlat` memakai hasil yang sama — sehingga apa yang lolos di
 * preview dijamin sama dengan yang ditulis ke database.
 */

import { normalisasi, resolveSemuaKolom, type MapelRow, type Resolution } from "./mapel-resolver";
import { hariEfektif } from "@/lib/attendance/calendar";

export const SEMESTER_MAX = 6;

export type ImportRow = Record<string, unknown>;

export interface ImportError {
  baris: number;
  pesan: string;
}

export type ImportWarning = ImportError;

export interface SiswaRow {
  id: string;
  kelas_id: string;
  nis: string;
  nama: string;
  jenis_kelamin: "L" | "P";
}

export interface GradeInput {
  mapelId: string;
  kode: string;
  nilai: number;
}

export interface AttendanceInput {
  sakit: number;
  izin: number;
  tanpaKeterangan: number;
}

export interface ParsedRow {
  baris: number;
  nis: string;
  nama: string;
  jenisKelamin: "L" | "P";
  semester: number;
  grades: GradeInput[];
  /** null bila file tidak punya kolom kehadiran sama sekali. */
  attendance: AttendanceInput | null;
  /** true bila siswa sudah ada dan berada di kelas tujuan (mode update). */
  isUpdate: boolean;
  siswaId?: string;
}

export interface ColumnReport {
  kolom: string;
  mapel: MapelRow | null;
  kind: Resolution["kind"];
  score: number;
  saran: Resolution["saran"];
  /** Berapa banyak baris terisi nilai pada kolom ini. */
  terisi: number;
}

export interface ValidateContext {
  mapelDb: MapelRow[];
  siswaByNis: Map<string, SiswaRow>;
  angkatanId: string;
  kelasId: string;
  /** Deteksi otomatis dari isi file; lihat `fileHasAttendanceSection`. */
  hasAttendanceSection?: boolean;
}

export interface ValidateResult {
  ok: boolean;
  /** Jumlah baris yang lolos validasi. */
  diterima: number;
  /** Jumlah baris yang punya minimal satu error. */
  ditolak: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  rows: ParsedRow[];
  columns: ColumnReport[];
  hasAttendanceSection: boolean;
}

/** Header struktural, sudah dinormalisasi. */
const STRUKTUR: Record<string, string[]> = {
  nis: ["nis", "nisn", "no induk", "nomor induk"],
  nama: ["nama", "nama siswa"],
  jenisKelamin: ["jenis kelamin", "jk", "jenis kelamin siswa"],
  semester: ["semester", "smt", "sem"],
  sakit: ["sakit"],
  izin: ["izin"],
  tanpaKeterangan: ["tanpa keterangan", "tanpa keterangan alpa", "alpa", "alpha"],
};

const STRUKTUR_NORM = new Map<string, string>();
for (const [field, aliases] of Object.entries(STRUKTUR)) {
  for (const a of aliases) STRUKTUR_NORM.set(normalisasi(a), field);
}

function fieldOf(kolom: string): string | null {
  return STRUKTUR_NORM.get(normalisasi(kolom)) ?? null;
}

function nilaiMentah(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function isNumeric(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim() !== "") return Number.isFinite(Number(v));
  return false;
}

function num(v: unknown): number | null {
  return isNumeric(v) ? Number(v) : null;
}

/** Kolom struktural yang benar-benar ada di file. */
export function detectColumns(rows: ImportRow[]): Set<string> {
  const found = new Set<string>();
  for (const r of rows) {
    for (const key of Object.keys(r)) {
      const f = fieldOf(key);
      if (f) found.add(f);
    }
  }
  return found;
}

/**
 * Apakah file punya bagian kehadiran? Dipakai agar file yang hanya memuat
 * nilai tidak ikut menimpa data kehadiran yang sudah ada.
 */
export function fileHasAttendanceSection(rows: ImportRow[]): boolean {
  const cols = detectColumns(rows);
  return cols.has("sakit") || cols.has("izin") || cols.has("tanpaKeterangan");
}

function pick(row: ImportRow, field: string): unknown {
  for (const [key, value] of Object.entries(row)) {
    if (fieldOf(key) === field) return nilaiMentah(value);
  }
  return null;
}

export function validateRows(
  rows: ImportRow[],
  ctx: ValidateContext
): ValidateResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const parsed: ParsedRow[] = [];

  const hasAttendanceSection = ctx.hasAttendanceSection ?? fileHasAttendanceSection(rows);
  const present = detectColumns(rows);

  // Resolusi kolom sekali untuk seluruh file.
  const semuaKolom = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const mapelKolom = semuaKolom.filter((k) => fieldOf(k) === null);
  const resolutions = resolveSemuaKolom(mapelKolom, ctx.mapelDb);

  const terisiPerKolom = new Map<string, number>();
  const seenNisSemester = new Set<string>();
  const ditolakBaris = new Set<number>();

  const err = (baris: number, pesan: string): void => {
    errors.push({ baris, pesan });
    ditolakBaris.add(baris);
  };
  const warn = (baris: number, pesan: string): void => {
    warnings.push({ baris, pesan });
  };

  // Bila file punya sebagian kolom kehadiran, sub-kolom yang tidak ada diisi 0
  // dengan peringatan, bukan diam-diam.
  for (const field of ["sakit", "izin", "tanpaKeterangan"] as const) {
    if (hasAttendanceSection && !present.has(field)) {
      warn(1, `Kolom ${field} tidak ada di file, diisi 0`);
    }
  }

  for (const [kolom, res] of resolutions) {
    if (res.mapel === null && res.kind === null) {
      const saran = res.saran ? ` (mungkin "${res.saran.nama}" / ${res.saran.kode})` : "";
      warn(1, `Kolom "${kolom}" tidak dikenali sebagai mapel dan diabaikan${saran}`);
    }
  }

  rows.forEach((r, i) => {
    const baris = i + 2;
    let barisOk = true;
    const fail = (pesan: string): void => {
      err(baris, pesan);
      barisOk = false;
    };

    const nis = str(pick(r, "nis"));
    if (!nis) fail("NIS kosong");

    const nama = str(pick(r, "nama"));
    if (!nama) fail("Nama kosong");

    const jkRaw = str(pick(r, "jenisKelamin")).toUpperCase();
    if (jkRaw !== "L" && jkRaw !== "P") {
      fail(`Jenis Kelamin harus L atau P (ditemukan "${jkRaw}")`);
    }

    const smt = num(pick(r, "semester"));
    const smtValid = smt !== null && Number.isInteger(smt) && smt >= 1 && smt <= SEMESTER_MAX;
    if (!smtValid) {
      fail(`Semester harus bilangan bulat 1-${SEMESTER_MAX}`);
    }

    // Pemeriksaan yang bergantung pada NIS/semester hanya jalan bila keduanya
    // sudah terisi, tapi seluruh masalah pada satu baris tetap dikumpulkan
    // sekaligus supaya operator tidak perlu mengunggah berkali-kali.
    let existing: SiswaRow | undefined;
    if (nis && smtValid) {
      const nsKey = `${nis}|${smt}`;
      if (seenNisSemester.has(nsKey)) {
        fail(`Duplikat NIS ${nis} pada semester ${smt} di dalam file`);
      } else {
        seenNisSemester.add(nsKey);
      }

      existing = ctx.siswaByNis.get(nis);
      if (existing && existing.kelas_id !== ctx.kelasId) {
        fail(
          `NIS ${nis} sudah terdaftar di kelas lain; pindah kelas harus lewat menu Siswa`
        );
      }
    }

    // Kehadiran
    let attendance: AttendanceInput | null = null;
    if (hasAttendanceSection) {
      const numField = (field: string, label: string): number => {
        const raw = pick(r, field);
        if (raw === null) return 0;
        const n = num(raw);
        if (n === null) {
          warn(baris, `${label} "${str(raw)}" bukan angka, diisi 0`);
          return 0;
        }
        if (n < 0) {
          fail(`${label} tidak boleh negatif`);
          return 0;
        }
        return Math.round(n);
      };
      attendance = {
        sakit: numField("sakit", "Sakit"),
        izin: numField("izin", "Izin"),
        tanpaKeterangan: numField("tanpaKeterangan", "Tanpa Keterangan"),
      };

      if (smtValid) {
        const total =
          attendance.sakit + attendance.izin + attendance.tanpaKeterangan;
        const batas = hariEfektif(smt);
        if (total > batas) {
          fail(
            `Total kehadiran semester ${smt} = ${total} hari, melebihi ${batas} hari efektif`
          );
        }
      }
    }

    // Nilai
    const grades: GradeInput[] = [];
    for (const [kolom, res] of resolutions) {
      if (res.mapel === null) continue;
      const raw = nilaiMentah(r[kolom]);
      if (raw === null) continue;

      if (!isNumeric(raw)) {
        warn(baris, `Nilai ${res.mapel.kode} "${str(raw)}" bukan angka, dilewati`);
        continue;
      }
      const n = Number(raw);
      if (n < 0 || n > 100) {
        fail(`Nilai ${res.mapel.kode} harus 0-100 (ditemukan ${n})`);
        continue;
      }
      grades.push({ mapelId: res.mapel.id, kode: res.mapel.kode, nilai: Math.round(n) });
      terisiPerKolom.set(kolom, (terisiPerKolom.get(kolom) ?? 0) + 1);
    }

    if (!barisOk) return;

    parsed.push({
      baris,
      nis,
      nama,
      jenisKelamin: jkRaw as "L" | "P",
      semester: smt as number,
      grades,
      attendance,
      isUpdate: existing !== undefined,
      siswaId: existing?.id,
    });
  });

  const columns: ColumnReport[] = [...resolutions].map(([kolom, res]) => ({
    kolom,
    mapel: res.mapel,
    kind: res.kind,
    score: res.score,
    saran: res.saran,
    terisi: terisiPerKolom.get(kolom) ?? 0,
  }));

  return {
    // All-or-nothing: bila ada satu saja baris cacat, tidak ada baris yang
    // akan ditulis, sehingga "diterima" harus 0 agar laporan tidak menipu.
    ok: errors.length === 0,
    diterima: errors.length === 0 ? parsed.length : 0,
    ditolak: ditolakBaris.size,
    errors,
    warnings,
    rows: parsed,
    columns,
    hasAttendanceSection,
  };
}
