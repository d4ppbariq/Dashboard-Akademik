import assert from "node:assert/strict";
import test from "node:test";
import {
  HARI_EFEKTIF,
  hariEfektif,
  hariHadir,
  rasioHadir,
} from "./calendar";

test("hari efektif sementara terkonfigurasi untuk semester 1-6", () => {
  for (let semester = 1; semester <= 6; semester += 1) {
    assert.equal(hariEfektif(semester), 100);
  }
  assert.equal(Object.keys(HARI_EFEKTIF).length, 6);
});

test("hariEfektif menolak semester di luar 1-6", () => {
  assert.throws(() => hariEfektif(0), RangeError);
  assert.throws(() => hariEfektif(7), RangeError);
  assert.throws(() => hariEfektif(1.5), RangeError);
});

test("rasioHadir tidak pernah negatif ketika absen melebihi hari efektif", () => {
  const hasil = rasioHadir(90, 20, 0, 5);
  assert.equal(hasil.nilai, 0);
  assert.equal(hasil.melebihi, true);
});

test("rasioHadir meng-clip absen ekstrem ke nol", () => {
  const hasil = rasioHadir(6, 0, 158, 5);
  assert.equal(hasil.nilai, 0);
  assert.equal(hasil.melebihi, true);
  assert.equal(hasil.hariEfektif, 100);
});

test("batas tepat sama dengan hari efektif diterima tanpa off-by-one", () => {
  const hasil = rasioHadir(40, 30, 30, 3);
  assert.equal(hasil.nilai, 0);
  assert.equal(hasil.melebihi, false);
  assert.equal(hariHadir(40, 30, 30, 3), 0);
});

test("hariHadir mengembalikan sisa hari yang masuk akal", () => {
  assert.equal(hariHadir(3, 2, 1, 1), 94);
  assert.equal(hariHadir(0, 0, 0, 6), 100);
});
