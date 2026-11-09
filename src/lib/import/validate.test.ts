import assert from "node:assert/strict";
import test from "node:test";
import {
  detectColumns,
  fileHasAttendanceSection,
  validateRows,
  type ImportRow,
  type SiswaRow,
  type ValidateContext,
} from "./validate";
import { MATA_PELAJARAN_DEFAULT } from "@/lib/db/seed";

const mapelDb = MATA_PELAJARAN_DEFAULT;
const ANGKATAN = "ang-1";
const KELAS = "kls-a";

function ctx(over: Partial<ValidateContext> = {}): ValidateContext {
  return {
    mapelDb,
    siswaByNis: new Map<string, SiswaRow>(),
    angkatanId: ANGKATAN,
    kelasId: KELAS,
    ...over,
  };
}

function row(extra: ImportRow): ImportRow {
  return { NIS: "1001", Nama: "Budi", "Jenis Kelamin": "L", Semester: 1, ...extra };
}

test("kolom struktural dikenali dalam berbagai kapitalisasi", () => {
  const cols = detectColumns([{ NIS: "1", NAMA: "a", SEMESTER: 1, SAKIT: 0, JENIS_KELAMIN: "L" }]);
  assert.ok(cols.has("nis") && cols.has("nama") && cols.has("semester"));
  assert.ok(cols.has("sakit") && cols.has("jenisKelamin"));
});

test("kolom mapel tidak salah dikira struktural", () => {
  const cols = detectColumns([{ NIS: "1", MTK: 80, BIN: 70, Alpa: 1 }]);
  assert.ok(!cols.has("MTK") && !cols.has("BIN"));
});

test("deteksi bagian kehadiran", () => {
  assert.equal(fileHasAttendanceSection([{ NIS: "1", Sakit: 1 }]), true);
  assert.equal(fileHasAttendanceSection([{ NIS: "1", ALPA: 1 }]), true);
  assert.equal(fileHasAttendanceSection([{ NIS: "1", MTK: 80 }]), false);
});

test("baris valid: nilai per mapel terbaca lewat kode", () => {
  const r = validateRows([row({ MTK: 80, BIN: 75, PJK: 90 })], ctx());
  assert.equal(r.ok, true);
  assert.equal(r.diterima, 1);
  assert.equal(r.rows[0].grades.length, 3);
  assert.deepEqual(
    r.rows[0].grades.map((g) => g.kode).sort(),
    ["BIN", "MTK", "PJK"]
  );
});

test("kolom PKN terbaca sebagai nilai PPKn", () => {
  for (const kolom of ["PKN", "PKn", "ppkn", "Pendidikan Kewarganegaraan"]) {
    const r = validateRows([row({ [kolom]: 85 })], ctx());
    assert.equal(r.ok, true, `kolom ${kolom} harus valid`);
    assert.equal(r.rows[0].grades.length, 1, `kolom ${kolom} harus menghasilkan satu nilai`);
    assert.equal(r.rows[0].grades[0].kode, "PPKn");
    assert.equal(r.rows[0].grades[0].nilai, 85);
    assert.equal(
      r.warnings.some((w) => w.pesan.includes(kolom)),
      false,
      `kolom ${kolom} tidak boleh dianggap tidak dikenal`
    );
  }
});

test("nilai 0 dan 100 keduanya valid", () => {
  const r = validateRows([row({ MTK: 0, BIN: 100 })], ctx());
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].grades.length, 2);
});

test("nilai di luar rentang jadi ERROR, bukan di-drop diam", () => {
  for (const bad of [120, -1, 1000]) {
    const r = validateRows([row({ MTK: bad })], ctx());
    assert.equal(r.ok, false, `nilai ${bad} harus menolak file`);
    assert.match(r.errors[0].pesan, /harus 0-100/);
  }
});

test("nilai non-numerik jadi peringatan, bukan error", () => {
  const r = validateRows([row({ MTK: "N/A", BIN: 80 })], ctx());
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].grades.length, 1);
  assert.equal(r.warnings.some((w) => w.pesan.includes("N/A")), true);
});

test("sel kosong dilewati tanpa error dan tanpa warning", () => {
  const r = validateRows([row({ MTK: "", BIN: null, PJK: undefined })], ctx());
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].grades.length, 0);
  assert.equal(r.warnings.length, 0);
});

test("jenis kelamin tak dikenal DITOLAK, bukan dipaksa jadi L", () => {
  const r = validateRows([{ NIS: "1", Nama: "A", "Jenis Kelamin": "X", Semester: 1 }], ctx());
  assert.equal(r.ok, false);
  assert.match(r.errors[0].pesan, /harus L atau P/);
  assert.equal(r.errors[0].pesan.includes('"X"'), true);
});

test("semester tidak bulat / di luar 1-6 ditolak", () => {
  for (const bad of [0, 7, 2.5, "abc"]) {
    const r = validateRows([row({ Semester: bad })], ctx());
    assert.equal(r.ok, false, `semester ${bad} harus ditolak`);
  }
});

test("NIS kosong dan Nama kosong ditolak", () => {
  assert.equal(validateRows([row({ NIS: "" })], ctx()).ok, false);
  assert.equal(validateRows([row({ Nama: "" })], ctx()).ok, false);
});

test("duplikat NIS+semester di dalam file ditolak", () => {
  const r = validateRows([row({ MTK: 80 }), row({ MTK: 81 })], ctx());
  assert.equal(r.ok, false);
  assert.match(r.errors[0].pesan, /Duplikat/);
});

test("NIS yang sudah ada di kelas yang sama = mode update (re-import diizinkan)", () => {
  const existing: SiswaRow = {
    id: "s-1",
    kelas_id: KELAS,
    nis: "1001",
    nama: "Budi Lama",
    jenis_kelamin: "L",
  };
  const r = validateRows([row({ MTK: 80 })], ctx({ siswaByNis: new Map([["1001", existing]]) }));
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].isUpdate, true);
  assert.equal(r.rows[0].siswaId, "s-1");
});

test("NIS yang sudah ada di kelas lain = konflik", () => {
  const existing: SiswaRow = {
    id: "s-9",
    kelas_id: "kls-z",
    nis: "1001",
    nama: "Budi",
    jenis_kelamin: "L",
  };
  const r = validateRows([row({ MTK: 80 })], ctx({ siswaByNis: new Map([["1001", existing]]) }));
  assert.equal(r.ok, false);
  assert.match(r.errors[0].pesan, /kelas lain/);
});

test("file tanpa kolom kehadiran: attendance null, tidak menimpa data lama", () => {
  const r = validateRows([row({ MTK: 80 })], ctx());
  assert.equal(r.hasAttendanceSection, false);
  assert.equal(r.rows[0].attendance, null);
});

test("file dengan kolom kehadiran: angka dibaca, negatif ditolak", () => {
  const ok = validateRows([row({ Sakit: 1, Izin: 2, "Tanpa Keterangan": 0, MTK: 80 })], ctx());
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.rows[0].attendance, { sakit: 1, izin: 2, tanpaKeterangan: 0 });

  const bad = validateRows([row({ Sakit: -1 })], ctx());
  assert.equal(bad.ok, false);
  assert.match(bad.errors[0].pesan, /tidak boleh negatif/);
});

test("total kehadiran melebihi hari efektif ditolak", () => {
  const r = validateRows(
    [row({ Sakit: 50, Izin: 30, "Tanpa Keterangan": 30, MTK: 80 })],
    ctx()
  );
  assert.equal(r.ok, false);
  assert.match(r.errors[0].pesan, /melebihi 100 hari efektif/);
});

test("total kehadiran tepat sama dengan hari efektif diterima", () => {
  const r = validateRows(
    [row({ Sakit: 40, Izin: 30, "Tanpa Keterangan": 30, MTK: 80 })],
    ctx()
  );
  assert.equal(r.ok, true);
});

test("kolom kehadiran non-numerik jadi peringatan, diisi 0", () => {
  const r = validateRows([row({ Sakit: "sakit", MTK: 80 })], ctx());
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].attendance?.sakit, 0);
  assert.equal(r.warnings.some((w) => w.pesan.includes("bukan angka")), true);
});

test("bagian kehadiran tidak lengkap memberi peringatan, bukan diam", () => {
  const r = validateRows([row({ Sakit: 1, MTK: 80 })], ctx());
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].attendance?.izin, 0);
  assert.equal(r.warnings.filter((w) => w.pesan.includes("tidak ada di file")).length, 2);
});

test("kolom tak dikenal dilaporkan sebagai peringatan beserta saran", () => {
  const r = validateRows([row({ "Kolom Ngawur": 1, MTK: 80 })], ctx());
  assert.equal(r.ok, true, "kolom asing tidak boleh menggagalkan seluruh file");
  assert.equal(r.warnings.some((w) => w.pesan.includes("Kolom Ngawur")), true);
  assert.equal(r.columns.some((c) => c.kolom === "Kolom Ngawur" && c.mapel === null), true);
});

test("laporan cakupan per kolom mapel", () => {
  const r = validateRows([row({ MTK: 80 }), row({ NIS: "1002", MTK: 70 })], ctx());
  const mtk = r.columns.find((c) => c.kolom === "MTK");
  assert.equal(mtk?.mapel?.kode, "MTK");
  assert.equal(mtk?.terisi, 2);
});

test("all-or-nothing: satu baris cacat membuat seluruh file ditolak", () => {
  const r = validateRows([row({ MTK: 80 }), row({ NIS: "1002", MTK: 999 })], ctx());
  assert.equal(r.ok, false);
  assert.equal(r.diterima, 0, "tidak boleh ada baris yang dilaporkan diterima");
  assert.equal(r.ditolak, 1);
  assert.equal(r.errors[0].baris, 3, "nomor baris menunjuk ke file, bukan index");
});

test("jumlah baris ditolak menghitung baris unik, bukan jumlah error", () => {
  const r = validateRows(
    [row({ "Jenis Kelamin": "X", MTK: 999 }), row({ NIS: "1003", Semester: 99 })],
    ctx()
  );
  assert.equal(r.ditolak, 2);
  assert.equal(r.errors.length, 3, "baris pertama punya dua error");
});

test("nomor baris dimulai dari 2 (baris 1 = header)", () => {
  const r = validateRows([row({})], ctx());
  assert.equal(r.ditolak, 0);
  const bad = validateRows([row({ "Jenis Kelamin": "X" })], ctx());
  assert.equal(bad.errors[0].baris, 2);
});

test("idempoten: memvalidasi dua kali menghasilkan keputusan identik", () => {
  const rows = [row({ MTK: 80, BIN: 77 })];
  const a = validateRows(rows, ctx());
  const b = validateRows(rows, ctx());
  assert.deepEqual(a.rows, b.rows);
  assert.equal(a.ok, b.ok);
});

test("file kosong tidak error", () => {
  const r = validateRows([], ctx());
  assert.equal(r.ok, true);
  assert.equal(r.diterima, 0);
});
