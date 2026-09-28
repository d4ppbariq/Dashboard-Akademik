/**
 * Resolver kolom mapel untuk impor nilai.
 *
 * Masalah yang diselesaikan: versi lama hanya mencocokkan nama mapel
 * (`nama_mapel.toLowerCase()`). File yang memakai header `kode` — yang justru
 * kita sarankan di template — tidak pernah dikenali, sehingga semua nilai
 * di-drop diam-diam sementara baris tetap dihitung "diterima".
 *
 * Modul ini murni (tanpa I/O, tanpa "use server") agar bisa diuji langsung.
 */

export interface MapelRow {
  id: string;
  kode: string;
  nama_mapel: string;
}

export type MatchKind = "kode" | "nama" | "alias" | "similar";

export interface Resolution {
  /** Header kolom pada file. */
  kolom: string;
  mapel: MapelRow | null;
  kind: MatchKind | null;
  /** 0..1; 1 untuk kode/nama/alias, nilai similarity untuk "similar". */
  score: number;
  /** Mapel terdekat ketika tidak ada yang cocok. */
  saran: { kode: string; nama: string; score: number } | null;
}

export const AMBANG_AUTOMATIS = 0.85;
export const AMBANG_SARAN = 0.65;

/**
 * Alias per kode, untuk variasi yang umum dipakai operator di spreadsheet.
 * Kode dan nama resmi diambil dari MATA_PELAJARAN_DEFAULT (src/lib/db/seed.ts);
 * SBK/PRK adalah mapel kurikulum lama yang ditambahkan lewat Master Data.
 */
const ALIAS: Record<string, string[]> = {
  PABP: ["Pendidikan Agama", "Pendidikan Agama Budi Pekerti", "Agama"],
  PPKN: ["Pendidikan Pancasila", "Pancasila", "Kewarganegaraan"],
  BIN: ["Bahasa Indo", "Bindo", "Indo"],
  MTK: ["Matematika", "Math", "Mat", "Matematik"],
  IPA: ["Ilmu Pengetahuan Alam"],
  IPS: ["Ilmu Pengetahuan Sosial"],
  BIG: ["Bahasa Inggris", "Inggris"],
  MUS: ["Seni Musik", "Musik"],
  PJK: ["PJOK", "Penjas", "Pendidikan Jasmani"],
  INF: ["Informatika", "Komputer", "TI"],
  SUN: ["Bahasa Sunda", "Sunda"],
  SBK: ["Seni dan Budaya", "Seni Budaya"],
  PRK: ["Prakarya", "Prakarya dan Memasak"],
};

/** Buang tanda baca, rapatkan spasi, lowercase. */
export function normalisasi(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.\-_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Alias dinormalisasi ke huruf kecil agar pencocokan tidak bergantung pada
 * kapitalisasi kode di database (kode asli "PPKn", bukan "PPKN").
 */
const ALIAS_NORM: Map<string, string[]> = new Map(
  Object.entries(ALIAS).map(([kode, list]) => [kode.toLowerCase(), list])
);

function aliasFor(kode: string): string[] {
  return ALIAS_NORM.get(kode.toLowerCase()) ?? [];
}

/** Kunci normalisasi untuk setiap mapel: kode, nama resmi, dan alias. */
export function buildMapelIndex(mapels: MapelRow[]): Map<string, MapelRow> {
  const index = new Map<string, MapelRow>();
  for (const m of mapels) {
    for (const key of [m.kode, m.nama_mapel, ...aliasFor(m.kode)]) {
      const n = normalisasi(key);
      if (n && !index.has(n)) index.set(n, m);
    }
  }
  return index;
}

/**
 * Similarity konservatif: hanya similarity berbasis prefix.
 * "matematika" vs "matematika wajib" -> 0,58 ; "musik" vs "seni musik" -> 0,6.
 * Both fall under AMBANG_SARAN, so a wrong match must not be auto-accepted.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (!longer.startsWith(shorter)) return 0;
  return shorter.length / longer.length;
}

function resolveWithIndex(
  kolom: string,
  mapels: MapelRow[],
  index: Map<string, MapelRow>
): Resolution {
  const n = normalisasi(kolom);
  if (!n) return { kolom, mapel: null, kind: null, score: 0, saran: null };

  for (const m of mapels) {
    if (normalisasi(m.kode) === n) {
      return { kolom, mapel: m, kind: "kode", score: 1, saran: null };
    }
  }
  for (const m of mapels) {
    if (normalisasi(m.nama_mapel) === n) {
      return { kolom, mapel: m, kind: "nama", score: 1, saran: null };
    }
  }

  const viaAlias = index.get(n);
  if (viaAlias) {
    return { kolom, mapel: viaAlias, kind: "alias", score: 1, saran: null };
  }

  let best: { mapel: MapelRow; score: number } | null = null;
  for (const m of mapels) {
    for (const candidate of [m.nama_mapel, ...aliasFor(m.kode)]) {
      const score = similarity(n, normalisasi(candidate));
      if (score > 0 && (!best || score > best.score)) {
        best = { mapel: m, score };
      }
    }
  }

  if (best && best.score >= AMBANG_SARAN) {
    return {
      kolom,
      mapel: best.score >= AMBANG_AUTOMATIS ? best.mapel : null,
      kind: "similar",
      score: best.score,
      saran: {
        kode: best.mapel.kode,
        nama: best.mapel.nama_mapel,
        score: best.score,
      },
    };
  }

  return { kolom, mapel: null, kind: null, score: 0, saran: null };
}

export function resolveKolom(kolom: string, mapels: MapelRow[]): Resolution {
  return resolveWithIndex(kolom, mapels, buildMapelIndex(mapels));
}

/** Resolusi sekali untuk seluruh kolom file, dengan index dibangun satu kali. */
export function resolveSemuaKolom(
  kolom: string[],
  mapels: MapelRow[]
): Map<string, Resolution> {
  const index = buildMapelIndex(mapels);
  const out = new Map<string, Resolution>();
  for (const k of kolom) out.set(k, resolveWithIndex(k, mapels, index));
  return out;
}
