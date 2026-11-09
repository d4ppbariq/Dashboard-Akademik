import assert from "node:assert/strict";
import test from "node:test";
import { ringkasPrediksi, type PrediksiBaris } from "./prediksi";

function baris(overrides: Partial<PrediksiBaris> = {}): PrediksiBaris {
  return {
    id: "pred-1",
    siswa_id: "s1",
    nis: "1",
    nama: "A",
    nama_kelas: "IX-A",
    tahun_lulus: 2026,
    cakupan: "RATA_RATA",
    nama_mapel: null,
    semester_asal: 5,
    semester_target: 6,
    nilai_prediksi: 85,
    interval_bawah: 82,
    interval_atas: 88,
    model_versi: "b2-rule-abc",
    jenis: "rule-engine",
    mae_model: 0.9,
    mae_b0: 1.38,
    n_siswa: 342,
    n_pasangan: 1336,
    dibuat_pada: "2026-11-08 00:00:00+00",
    ...overrides,
  };
}

test("ringkasan prediksi kosong", () => {
  assert.deepEqual(ringkasPrediksi([]), {
    totalBaris: 0,
    totalSiswa: 0,
    totalCakupan: 0,
    modelVersi: "-",
    jenis: "-",
  });
});

test("ringkasan menghitung siswa dan cakupan unik", () => {
  const rows = [
    baris(),
    baris({ id: "pred-2", cakupan: "MTK", nama_mapel: "Matematika" }),
    baris({ id: "pred-3", siswa_id: "s2", cakupan: "MTK" }),
  ];
  assert.deepEqual(ringkasPrediksi(rows), {
    totalBaris: 3,
    totalSiswa: 2,
    totalCakupan: 2,
    modelVersi: "b2-rule-abc",
    jenis: "rule-engine",
  });
});
