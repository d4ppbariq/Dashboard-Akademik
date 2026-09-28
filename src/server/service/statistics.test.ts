import assert from "node:assert/strict";
import test from "node:test";
import {
  getKehadiranSiswa,
  getPeringkatMapel,
  getPeringkatMapelSiswa,
  getRekapNilaiPerSemester,
  getRekapNilaiSiswa,
  getRingkasan,
  getTrenNilai,
  getTrenNilaiSiswa,
  type RekapNilaiItem,
} from "./statistics";
import type { Database } from "@/lib/db/types";

function emptyDatabase(): Database {
  return {
    roles: [],
    users: [],
    permissions: [],
    menus: [],
    routes: [],
    role_permissions: [],
    role_menus: [],
    role_routes: [],
    angkatan: [],
    kelas: [],
    siswa: [],
    mata_pelajaran: [],
    nilai_siswa: [],
    kehadiran_siswa: [],
    audit_log: [],
  };
}

/** MTK berlaku untuk angkatan ini, INF tidak (kurikulum berbeda). */
function dbDengan(): Database {
  const db = emptyDatabase();
  db.mata_pelajaran = [
    { id: "mp-mtk", kode: "MTK", nama_mapel: "Matematika", urutan: 1 },
    { id: "mp-inf", kode: "INF", nama_mapel: "Informatika", urutan: 2 },
  ];
  db.siswa = [{ id: "s-1", kelas_id: "k-1", nis: "1", nama: "A", jenis_kelamin: "L" }];
  db.nilai_siswa = [
    { id: "n-1", siswa_id: "s-1", mata_pelajaran_id: "mp-mtk", semester: 1, nilai: 80 },
  ];
  return db;
}

test("mapel tanpa data bernilai null, bukan 0", () => {
  const db = dbDengan();
  const rekap = getRekapNilaiPerSemester(db, ["s-1"], 1);
  const mtk = rekap.find((r) => r.kode === "MTK");
  const inf = rekap.find((r) => r.kode === "INF");

  assert.equal(mtk?.nilai, 80);
  assert.equal(inf?.nilai, null, "mapel tanpa data harus null");
  assert.notEqual(inf?.nilai, 0, "0 adalah nilai sah dan tidak boleh dipakai sebagai penanda kosong");
});

test("nilai 0 yang asli tetap 0, bukan null", () => {
  const db = dbDengan();
  db.nilai_siswa = [
    { id: "n-1", siswa_id: "s-1", mata_pelajaran_id: "mp-mtk", semester: 1, nilai: 0 },
  ];
  const rekap = getRekapNilaiPerSemester(db, ["s-1"], 1);
  assert.equal(rekap.find((r) => r.kode === "MTK")?.nilai, 0);
});

test("tidak ada siswa sama sekali -> semua null", () => {
  const rekap = getRekapNilaiPerSemester(dbDengan(), [], 1);
  assert.equal(rekap.length, 2);
  assert.ok(rekap.every((r) => r.nilai === null));
});

test("getTrenNilai: semester tanpa nilai mapel -> null", () => {
  const tren = getTrenNilai(dbDengan(), ["s-1"], ["mp-mtk", "mp-inf"]);
  assert.equal(tren[0].MTK, 80);
  assert.equal(tren[0].INF, null);
  // Semester berikutnya tidak ada data sama sekali.
  assert.equal(tren[1].MTK, null);
  assert.equal(tren[1].INF, null);
});

test("getRekapNilaiSiswa konsisten dengan getTrenNilaiSiswa", () => {
  const db = dbDengan();
  const rekap = getRekapNilaiSiswa(db, "s-1", 1);
  const tren = getTrenNilaiSiswa(db, "s-1", ["mp-mtk", "mp-inf"]);

  assert.equal(rekap.find((r) => r.kode === "MTK")?.nilai, 80);
  assert.equal(rekap.find((r) => r.kode === "INF")?.nilai, null);
  assert.equal(tren[0].MTK, 80);
  assert.equal(tren[0].INF, null);
});

test("peringkat kelas: null di urutan akhir, bukan dianggap terendah", () => {
  const db = dbDengan();
  db.nilai_siswa.push(
    { id: "n-2", siswa_id: "s-1", mata_pelajaran_id: "mp-inf", semester: 2, nilai: 90 }
  );
  const pering = getPeringkatMapel(db, ["s-1"], 1);
  // Hanya MTK punya nilai di semester 1, INF null.
  assert.equal(pering[0].kode, "MTK");
  assert.equal(pering[pering.length - 1].kode, "INF");
  assert.equal(pering[pering.length - 1].nilai, null);
});

test("peringkat siswa: null tidak mendarat di dasar", () => {
  const pering = getPeringkatMapelSiswa(dbDengan(), "s-1", 1);
  assert.equal(pering[0].kode, "MTK");
  assert.equal(pering[pering.length - 1].nilai, null);
});

test("peringkat dengan semua null tidak melempar", () => {
  const pering = getPeringkatMapel(dbDengan(), [], 1);
  assert.equal(pering.length, 2);
  assert.ok(pering.every((r) => r.nilai === null));
});

test("FUNGSI PENJUMLAHAN tetap memakai 0 untuk data kosong", () => {
  // Regression guard: fungsi ini tidak boleh ikut berubah jadi null.
  const db = dbDengan();
  const r = getRingkasan(db, ["s-1"]);
  assert.deepEqual(r, { totalSiswa: 1, totalSakit: 0, totalIzin: 0, totalAlpa: 0 });

  const k = getKehadiranSiswa(db, "s-1");
  assert.deepEqual(k[0], { semester: "Sem 1", Sakit: 0, Izin: 0, Alpa: 0 });
});

test("rata-rata kelas dihitung hanya dari mapel yang punya nilai", () => {
  // Menggandakan kondisi di kelas/page.tsx: null tidak boleh ikut menjumlahkan.
  const rekap = getRekapNilaiPerSemester(dbDengan(), ["s-1"], 1);
  const adaNilai = rekap.filter((r) => r.nilai !== null);
  const rata = adaNilai.reduce((a, r) => a + (r.nilai as number), 0) / adaNilai.length;
  assert.equal(rata, 80, "tidak boleh 80/2 = 40");
});

test("RekapNilaiItem menerima null pada tipe level", () => {
  const item: RekapNilaiItem = { kode: "X", mapel: "Y", nilai: null };
  assert.equal(item.nilai, null);
});
