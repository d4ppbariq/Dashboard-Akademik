import assert from "node:assert/strict";
import test from "node:test";
import { applyRows } from "./apply";
import { validateRows } from "./validate";
import { IdAllocator } from "@/lib/db/id";
import type { Database } from "@/lib/db/types";
import { MATA_PELAJARAN_DEFAULT } from "@/lib/db/seed";

const KELAS = "kls-a";
const ANGKATAN = "ang-1";

function emptyDatabase(): Database {
  return {
    roles: [], users: [], permissions: [], menus: [], routes: [],
    role_permissions: [], role_menus: [], role_routes: [],
    angkatan: [], kelas: [], siswa: [], mata_pelajaran: [],
    nilai_siswa: [], kehadiran_siswa: [], audit_log: [],
  };
}

function dbAwal(): Database {
  const db = emptyDatabase();
  db.mata_pelajaran = [...MATA_PELAJARAN_DEFAULT];
  db.siswa = [{ id: "s-1", kelas_id: KELAS, nis: "1001", nama: "Budi Lama", jenis_kelamin: "L" }];
  return db;
}

function ctx(db: Database) {
  return {
    mapelDb: db.mata_pelajaran,
    siswaByNis: new Map(db.siswa.map((s) => [s.nis, s])),
    angkatanId: ANGKATAN,
    kelasId: KELAS,
  };
}

/** Pipeline penuh: validasi lalu tulis, seperti actions.ts melakukannya. */
function impor(db: Database, rows: Record<string, unknown>[]): void {
  const result = validateRows(rows, ctx(db));
  assert.equal(result.ok, true, `validasi gagal: ${JSON.stringify(result.errors)}`);
  applyRows(db, result.rows, KELAS, new IdAllocator());
}

test("siswa baru dibuat saat belum ada", () => {
  const db = dbAwal();
  impor(db, [{ NIS: "2002", Nama: "Siti", "Jenis Kelamin": "P", Semester: 1, MTK: 80 }]);
  const s = db.siswa.find((x) => x.nis === "2002");
  assert.ok(s);
  assert.equal(s.nama, "Siti");
  assert.equal(s.kelas_id, KELAS);
  assert.equal(db.nilai_siswa.length, 1);
});

test("siswa yang sudah ada diperbarui, bukan diduplikasi", () => {
  const db = dbAwal();
  impor(db, [{ NIS: "1001", Nama: "Budi Baru", "Jenis Kelamin": "P", Semester: 1, MTK: 85 }]);
  assert.equal(db.siswa.length, 1, "tidak boleh menambah siswa");
  assert.equal(db.siswa[0].nama, "Budi Baru");
  assert.equal(db.siswa[0].jenis_kelamin, "P");
});

test("IDEPOTEN: impor file yang sama dua kali tidak menambah baris", () => {
  const db = dbAwal();
  const file = [{ NIS: "2002", Nama: "Siti", "Jenis Kelamin": "P", Semester: 1, MTK: 80, BIN: 70 }];
  impor(db, file);
  const setelahSatu = {
    siswa: db.siswa.length,
    nilai: db.nilai_siswa.length,
    kehadiran: db.kehadiran_siswa.length,
  };
  impor(db, file);
  impor(db, file);
  assert.equal(db.siswa.length, setelahSatu.siswa);
  assert.equal(db.nilai_siswa.length, setelahSatu.nilai);
  assert.equal(db.kehadiran_siswa.length, setelahSatu.kehadiran);
  assert.equal(db.siswa.length, 2);
  assert.equal(db.nilai_siswa.length, 2);
});

test("nilai untuk kombinasi yang sama diperbarui in-place, bukan diduplikasi", () => {
  const db = dbAwal();
  impor(db, [{ NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 1, MTK: 80 }]);
  const idAwal = db.nilai_siswa[0].id;
  impor(db, [{ NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 1, MTK: 95 }]);
  assert.equal(db.nilai_siswa.length, 1);
  assert.equal(db.nilai_siswa[0].nilai, 95);
  assert.equal(db.nilai_siswa[0].id, idAwal, "id lama harus dipertahankan");
});

test("semester berbeda tetap menghasilkan baris terpisah", () => {
  const db = dbAwal();
  impor(db, [
    { NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 1, MTK: 80 },
    { NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 2, MTK: 85 },
  ]);
  assert.equal(db.nilai_siswa.length, 2);
  assert.deepEqual(db.nilai_siswa.map((n) => n.semester).sort(), [1, 2]);
});

test("REGRESI: file tanpa kolom kehadiran tidak mengubah data kehadiran lama", () => {
  const db = dbAwal();
  db.kehadiran_siswa = [
    { id: "k-1", siswa_id: "s-1", semester: 1, sakit: 3, izin: 2, tanpa_keterangan: 1 },
  ];
  impor(db, [{ NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 1, MTK: 80 }]);
  assert.equal(db.kehadiran_siswa.length, 1);
  assert.deepEqual(db.kehadiran_siswa[0], {
    id: "k-1", siswa_id: "s-1", semester: 1, sakit: 3, izin: 2, tanpa_keterangan: 1,
  });
});

test("file dengan kolom kehadiran memperbarui data lama", () => {
  const db = dbAwal();
  db.kehadiran_siswa = [
    { id: "k-1", siswa_id: "s-1", semester: 1, sakit: 3, izin: 2, tanpa_keterangan: 1 },
  ];
  impor(db, [{ NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 1, Sakit: 0, MTK: 80 }]);
  assert.equal(db.kehadiran_siswa.length, 1);
  assert.equal(db.kehadiran_siswa[0].sakit, 0);
  assert.equal(db.kehadiran_siswa[0].izin, 0, "kolom izin absen diisi 0");
  assert.equal(db.kehadiran_siswa[0].id, "k-1");
});

test("kehadiran untuk siswa+semester yang belum ada ditambahkan", () => {
  const db = dbAwal();
  impor(db, [{ NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 2, Sakit: 1, MTK: 80 }]);
  assert.equal(db.kehadiran_siswa.length, 1);
  assert.equal(db.kehadiran_siswa[0].semester, 2);
});

test("ID baru unik dan tidak menabrak id lama", () => {
  const db = dbAwal();
  impor(db, [
    { NIS: "2002", Nama: "A", "Jenis Kelamin": "L", Semester: 1, MTK: 80 },
    { NIS: "2003", Nama: "B", "Jenis Kelamin": "L", Semester: 1, MTK: 80 },
  ]);
  const ids = [db.siswa[1].id, db.siswa[2].id, db.nilai_siswa[0].id, db.nilai_siswa[1].id];
  assert.equal(new Set(ids).size, ids.length, "semua id harus berbeda");
  assert.notEqual(db.siswa[1].id, "s-1");
});

test("nilai 0 dan 100 tersimpan utuh", () => {
  const db = dbAwal();
  impor(db, [{ NIS: "1001", Nama: "B", "Jenis Kelamin": "L", Semester: 1, MTK: 0, BIN: 100 }]);
  const nilai = db.nilai_siswa.map((n) => n.nilai).sort((a, b) => a - b);
  assert.deepEqual(nilai, [0, 100]);
});

test("skor desimal dibulatkan", () => {
  const db = dbAwal();
  impor(db, [{ NIS: "1001", Nama: "B", "Jenis Kelamin": "L", Semester: 1, MTK: 82.6 }]);
  assert.equal(db.nilai_siswa[0].nilai, 83);
});

test("impor massal tetap konsisten ( Smoke test 200 siswa )", () => {
  const db = dbAwal();
  const file = Array.from({ length: 200 }, (_, i) => ({
    NIS: String(3000 + i),
    Nama: `Siswa ${i}`,
    "Jenis Kelamin": i % 2 === 0 ? "L" : "P",
    Semester: 1,
    MTK: 70,
    BIN: 75,
  }));
  impor(db, file);
  assert.equal(db.siswa.length, 201);
  assert.equal(db.nilai_siswa.length, 400);

  impor(db, file);
  assert.equal(db.siswa.length, 201, "ulang impor tidak boleh menambah siswa");
  assert.equal(db.nilai_siswa.length, 400, "ulang impor tidak boleh menambah nilai");
});
