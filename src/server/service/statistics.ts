import "server-only";
import type { Database } from "@/lib/db/types";
import { JUMLAH_SEMESTER } from "@/lib/db/seed";

export interface Ringkasan {
  totalSiswa: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
}

export interface GenderItem {
  name: string;
  value: number;
}

export interface KehadiranPerSemester {
  semester: string;
  Sakit: number;
  Izin: number;
  Alpa: number;
}

export interface TrenNilaiItem {
  semester: string;
  [mapelKode: string]: string | number | null;
}

export interface RekapNilaiItem {
  kode: string;
  mapel: string;
  nilai: number;
}

export function kelasIdsInAngkatan(db: Database, angkatanId: string): string[] {
  return db.kelas.filter((k) => k.angkatan_id === angkatanId).map((k) => k.id);
}

export function siswaIdsInAngkatan(
  db: Database,
  angkatanId: string
): string[] {
  const kelasIds = new Set(kelasIdsInAngkatan(db, angkatanId));
  return db.siswa.filter((s) => kelasIds.has(s.kelas_id)).map((s) => s.id);
}

export function siswaIdsInKelas(db: Database, kelasId: string): string[] {
  return db.siswa.filter((s) => s.kelas_id === kelasId).map((s) => s.id);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function getRingkasan(db: Database, siswaIds: string[]): Ringkasan {
  const set = new Set(siswaIds);
  const kehadiran = db.kehadiran_siswa.filter((k) => set.has(k.siswa_id));
  return {
    totalSiswa: siswaIds.length,
    totalSakit: kehadiran.reduce((a, k) => a + k.sakit, 0),
    totalIzin: kehadiran.reduce((a, k) => a + k.izin, 0),
    totalAlpa: kehadiran.reduce((a, k) => a + k.tanpa_keterangan, 0),
  };
}

export function getGenderDistribution(
  db: Database,
  siswaIds: string[]
): GenderItem[] {
  const set = new Set(siswaIds);
  let l = 0;
  let p = 0;
  for (const s of db.siswa) {
    if (!set.has(s.id)) continue;
    if (s.jenis_kelamin === "L") l += 1;
    else p += 1;
  }
  return [
    { name: "Laki-laki", value: l },
    { name: "Perempuan", value: p },
  ];
}

export function getKehadiranPerSemester(
  db: Database,
  siswaIds: string[]
): KehadiranPerSemester[] {
  const set = new Set(siswaIds);
  const perSemester = db.kehadiran_siswa.filter((k) => set.has(k.siswa_id));
  return Array.from({ length: JUMLAH_SEMESTER }, (_, i) => {
    const smt = i + 1;
    const rows = perSemester.filter((k) => k.semester === smt);
    return {
      semester: `Sem ${smt}`,
      Sakit: rows.reduce((a, k) => a + k.sakit, 0),
      Izin: rows.reduce((a, k) => a + k.izin, 0),
      Alpa: rows.reduce((a, k) => a + k.tanpa_keterangan, 0),
    };
  });
}

export function getTrenNilai(
  db: Database,
  siswaIds: string[],
  mapelIds: string[]
): TrenNilaiItem[] {
  const set = new Set(siswaIds);
  const rows = db.nilai_siswa.filter((n) => set.has(n.siswa_id));
  const mapel = db.mata_pelajaran.filter((m) => mapelIds.includes(m.id));

  return Array.from({ length: JUMLAH_SEMESTER }, (_, i) => {
    const smt = i + 1;
    const item: TrenNilaiItem = { semester: `Sem ${smt}` };
    for (const m of mapel) {
      const vals = rows
        .filter((n) => n.semester === smt && n.mata_pelajaran_id === m.id)
        .map((n) => n.nilai);
      item[m.kode] = round1(avg(vals));
    }
    return item;
  });
}

export function getRekapNilaiPerSemester(
  db: Database,
  siswaIds: string[],
  semester: number
): RekapNilaiItem[] {
  const set = new Set(siswaIds);
  const rows = db.nilai_siswa.filter(
    (n) => set.has(n.siswa_id) && n.semester === semester
  );
  return db.mata_pelajaran.map((m) => {
    const vals = rows
      .filter((n) => n.mata_pelajaran_id === m.id)
      .map((n) => n.nilai);
    return {
      kode: m.kode,
      mapel: m.nama_mapel,
      nilai: round1(avg(vals)),
    };
  });
}

export function getPeringkatMapel(
  db: Database,
  siswaIds: string[],
  semester: number
): RekapNilaiItem[] {
  return getRekapNilaiPerSemester(db, siswaIds, semester).sort(
    (a, b) => b.nilai - a.nilai
  );
}

export function getTrenNilaiSiswa(
  db: Database,
  siswaId: string,
  mapelIds: string[]
): TrenNilaiItem[] {
  const rows = db.nilai_siswa.filter(
    (n) => n.siswa_id === siswaId && mapelIds.includes(n.mata_pelajaran_id)
  );
  const mapel = db.mata_pelajaran.filter((m) => mapelIds.includes(m.id));
  return Array.from({ length: JUMLAH_SEMESTER }, (_, i) => {
    const smt = i + 1;
    const item: TrenNilaiItem = { semester: `Sem ${smt}` };
    for (const m of mapel) {
      const found = rows.find(
        (n) => n.semester === smt && n.mata_pelajaran_id === m.id
      );
      item[m.kode] = found ? found.nilai : null;
    }
    return item;
  });
}

export function getKehadiranSiswa(
  db: Database,
  siswaId: string
): KehadiranPerSemester[] {
  const rows = db.kehadiran_siswa.filter((k) => k.siswa_id === siswaId);
  return Array.from({ length: JUMLAH_SEMESTER }, (_, i) => {
    const smt = i + 1;
    const row = rows.find((k) => k.semester === smt);
    return {
      semester: `Sem ${smt}`,
      Sakit: row?.sakit ?? 0,
      Izin: row?.izin ?? 0,
      Alpa: row?.tanpa_keterangan ?? 0,
    };
  });
}

export function getRekapNilaiSiswa(
  db: Database,
  siswaId: string,
  semester: number
): RekapNilaiItem[] {
  const rows = db.nilai_siswa.filter(
    (n) => n.siswa_id === siswaId && n.semester === semester
  );
  return db.mata_pelajaran.map((m) => {
    const found = rows.find((n) => n.mata_pelajaran_id === m.id);
    return { kode: m.kode, mapel: m.nama_mapel, nilai: found?.nilai ?? 0 };
  });
}

export function getPeringkatMapelSiswa(
  db: Database,
  siswaId: string,
  semester: number
): RekapNilaiItem[] {
  return getRekapNilaiSiswa(db, siswaId, semester).sort(
    (a, b) => b.nilai - a.nilai
  );
}
