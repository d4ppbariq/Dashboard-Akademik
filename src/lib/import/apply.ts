/**
 * Penulisan hasil impor ke objek Database.
 *
 * Modul murni (tanpa I/O) supaya aturan upsert-nya bisa diuji langsung: ini
 * bagian yang paling berbahaya bila salah, karena kesalahan di sini berarti
 * data corrup tanpa error yang terlihat.
 *
 * Dua keputusan penting yang diterapkan di sini:
 *  1. Kehadiran hanya disentuh bila file punya kolomnya (lihat `ParsedRow.attendance`).
 *  2. Semua pencarian memakai index Map, bukan memindai array per baris.
 */

import type { Database } from "@/lib/db/types";
import type { IdAllocator } from "@/lib/db/id";
import { nisDasar } from "@/lib/nis";
import type { ParsedRow } from "./validate";

type Siswa = Database["siswa"][number];

export function applyRows(
  db: Database,
  rows: ParsedRow[],
  kelasId: string,
  ids: IdAllocator
): void {
  // PENTING: map ini menyimpan REFERENSI ke objek asli di db.siswa, bukan
  // salinan. Bila memakai salinan, perubahan nama/jenis kelamin pada siswa
  // yang sudah ada akan hilang tanpa error.
  const byNis = new Map<string, Siswa>();
  for (const s of db.siswa) {
    byNis.set(s.nis, s);
    byNis.set(nisDasar(s.nis), s);
  }

  // Index O(1) menggantikan pemindaian array penuh per baris dan per nilai.
  const kehadiranIndex = new Map<string, number>();
  db.kehadiran_siswa.forEach((k, i) => {
    kehadiranIndex.set(`${k.siswa_id}|${k.semester}`, i);
  });
  const nilaiIndex = new Map<string, number>();
  db.nilai_siswa.forEach((n, i) => {
    nilaiIndex.set(`${n.siswa_id}|${n.mata_pelajaran_id}|${n.semester}`, i);
  });

  for (const row of rows) {
    let siswa = byNis.get(row.nis);
    if (!siswa) {
      const id = ids.next("s");
      siswa = {
        id,
        kelas_id: kelasId,
        nis: row.nis,
        nama: row.nama,
        jenis_kelamin: row.jenisKelamin,
      };
      db.siswa.push(siswa);
      byNis.set(row.nis, siswa);
      byNis.set(nisDasar(row.nis), siswa);
    } else {
      // Referensi, jadi perubahan ini langsung terlihat di db.siswa.
      siswa.nama = row.nama;
      siswa.jenis_kelamin = row.jenisKelamin;
    }

    // null berarti file tidak punya kolom kehadiran: data lama harus utuh.
    if (row.attendance) {
      const key = `${siswa.id}|${row.semester}`;
      const at = kehadiranIndex.get(key);
      const next = {
        id: at === undefined ? ids.next("k") : db.kehadiran_siswa[at].id,
        siswa_id: siswa.id,
        semester: row.semester,
        sakit: row.attendance.sakit,
        izin: row.attendance.izin,
        tanpa_keterangan: row.attendance.tanpaKeterangan,
      };
      if (at === undefined) {
        kehadiranIndex.set(key, db.kehadiran_siswa.push(next) - 1);
      } else {
        db.kehadiran_siswa[at] = next;
      }
    }

    for (const g of row.grades) {
      const key = `${siswa.id}|${g.mapelId}|${row.semester}`;
      const at = nilaiIndex.get(key);
      const next = {
        id: at === undefined ? ids.next("n") : db.nilai_siswa[at].id,
        siswa_id: siswa.id,
        mata_pelajaran_id: g.mapelId,
        semester: row.semester,
        nilai: g.nilai,
      };
      if (at === undefined) {
        nilaiIndex.set(key, db.nilai_siswa.push(next) - 1);
      } else {
        db.nilai_siswa[at] = next;
      }
    }
  }
}
