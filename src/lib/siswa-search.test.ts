import assert from "node:assert/strict";
import test from "node:test";
import { siswaMencocok, saringSiswa } from "./siswa-search";

const BUDI = { nama: "Budi Santoso", nis: "25071" };
const CITRA = { nama: "Citra Ayu", nis: "25072" };

test("kueri kosong tidak menyaring apa pun", () => {
  assert.equal(siswaMencocok(BUDI, ""), true);
  assert.equal(siswaMencocok(CITRA, ""), true);
});

test("kueri hanya spasi diperlakukan sama dengan kosong", () => {
  assert.equal(siswaMencocok(BUDI, "   "), true);
  assert.equal(siswaMencocok(BUDI, "\t\n"), true);
});

test("nama dicocokkan dengan contains, bukan harus sama persis", () => {
  assert.equal(siswaMencocok(BUDI, "budi"), true);
  assert.equal(siswaMencocok(BUDI, "Santoso"), true);
  assert.equal(siswaMencocok(BUDI, "di San"), true, "cari di tengah kata");
});

test("pencocokan nama tidak peduli huruf besar-kecil", () => {
  assert.equal(siswaMencocok(BUDI, "BUDI"), true);
  assert.equal(siswaMencocok(BUDI, "bUdi sAntoSO"), true);
});

test("NIS dicocokkan dengan prefix", () => {
  assert.equal(siswaMencocok(BUDI, "25071"), true);
  assert.equal(siswaMencocok(BUDI, "2507"), true);
  assert.equal(siswaMencocok(BUDI, "25"), true);
});

test("prefix NIS tidak ikut cocok di tengah angka", () => {
  // 12507 memuat "2507" sebagai substring, tetapi bukan prefix.
  const siswa = { nama: "Zainal", nis: "12507" };
  assert.equal(siswaMencocok(siswa, "2507"), false);
  assert.equal(siswaMencocok(siswa, "12507"), true);
});

test("kueri yang tidak ada padanannya tidak cocok", () => {
  assert.equal(siswaMencocok(BUDI, "citra"), false);
  assert.equal(siswaMencocok(BUDI, "99999"), false);
});

test("kueri dipangkas spasi di kedua sisi", () => {
  assert.equal(siswaMencocok(BUDI, "  budi  "), true);
  assert.equal(siswaMencocok(BUDI, " 2507 "), true);
});

test("saringSiswa mengembalikan daftar tanpa mengubah urutan", () => {
  const semua = [
    { nama: "Andi", nis: "25070" },
    BUDI,
    { nama: "Dewi", nis: "25073" },
    CITRA,
  ];
  assert.deepEqual(saringSiswa(semua, "budi").map((s) => s.nis), ["25071"]);
  assert.deepEqual(saringSiswa(semua, "25").map((s) => s.nis), [
    "25070", "25071", "25073", "25072",
  ]);
  assert.equal(saringSiswa(semua, "").length, 4);
  assert.equal(saringSiswa(semua, "zzz").length, 0);
});

test("kueri kosong pada saringSiswa mengembalikan salinan, bukan array asal", () => {
  const semua = [BUDI, CITRA];
  const hasil = saringSiswa(semua, "");
  assert.deepEqual(hasil, semua);
  assert.notEqual(hasil, semua, "harus array baru supaya tidak bisa mengubah asal");
});
