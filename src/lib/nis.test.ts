import assert from "node:assert/strict";
import test from "node:test";
import { nisDasar, normalisasiNis } from "./nis";

test("NIS angka bulat diterima", () => {
  assert.deepEqual(normalisasiNis("232470119"), { ok: true, nis: "232470119" });
  assert.deepEqual(normalisasiNis(232470119), { ok: true, nis: "232470119" });
});

test("leading zero dipertahankan", () => {
  assert.deepEqual(normalisasiNis("001234"), { ok: true, nis: "001234" });
});

test("desimal nol dinormalisasi ke bentuk bulat", () => {
  assert.deepEqual(normalisasiNis("232470119.0"), { ok: true, nis: "232470119" });
});

test("NIS berpecahan ditolak", () => {
  for (const value of ["232470119.083077", 232470119.5]) {
    const hasil = normalisasiNis(value);
    assert.equal(hasil.ok, false);
    if (!hasil.ok) assert.match(hasil.error, /bilangan bulat/);
  }
});

test("NIS kosong, negatif, dan non-angka ditolak", () => {
  for (const value of [null, undefined, "", "   ", "-1", "12a", "1e6"]) {
    assert.equal(normalisasiNis(value).ok, false);
  }
});

test("nisDasar mengambil bagian sebelum titik", () => {
  assert.equal(nisDasar("232470119.083077"), "232470119");
  assert.equal(nisDasar("232470119"), "232470119");
});
