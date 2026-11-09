import kalender from "../../../config/hari-efektif.json";

export const SEMESTER_MIN = 1;
export const SEMESTER_MAX = 6;

/**
 * Angka ini adalah asumsi sementara, bukan kalender resmi sekolah.
 * Sumber tunggalnya ada di `config/hari-efektif.json` agar aplikasi dan
 * pipeline ML memakai denominator yang sama.
 */
export const SUMBER_HARI_EFEKTIF = kalender.sumber;
export const CATATAN_HARI_EFEKTIF = kalender.catatan;

const HARI_EFEKTIF_JSON = kalender.hariEfektif as Record<string, number>;

export const HARI_EFEKTIF: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(HARI_EFEKTIF_JSON).map(([semester, hari]) => [Number(semester), hari])
  )
);

export interface RasioHadir {
  /** Nilai 0..1, sudah di-clip agar tidak pernah negatif. */
  nilai: number;
  /** True bila total absen melebihi hari efektif semester tersebut. */
  melebihi: boolean;
  hariEfektif: number;
}

export function hariEfektif(semester: number): number {
  if (
    !Number.isInteger(semester) ||
    semester < SEMESTER_MIN ||
    semester > SEMESTER_MAX
  ) {
    throw new RangeError(
      `Semester harus bilangan bulat ${SEMESTER_MIN}-${SEMESTER_MAX}, diterima: ${semester}`
    );
  }

  const batas = HARI_EFEKTIF[semester];
  if (batas === undefined) {
    throw new Error(`Hari efektif semester ${semester} belum dikonfigurasi`);
  }
  return batas;
}

export function rasioHadir(
  sakit: number,
  izin: number,
  alpa: number,
  semester: number
): RasioHadir {
  if (sakit < 0 || izin < 0 || alpa < 0) {
    throw new RangeError("Jumlah sakit, izin, dan alpa tidak boleh negatif");
  }

  const batas = hariEfektif(semester);
  const absen = sakit + izin + alpa;
  const melebihi = absen > batas;
  const nilai = Math.min(1, Math.max(0, (batas - absen) / batas));

  return { nilai, melebihi, hariEfektif: batas };
}

/** Jumlah hari hadir yang sudah di-clip pada rentang 0..hari efektif. */
export function hariHadir(
  sakit: number,
  izin: number,
  alpa: number,
  semester: number
): number {
  const { nilai, hariEfektif: batas } = rasioHadir(sakit, izin, alpa, semester);
  return Math.round(nilai * batas);
}
