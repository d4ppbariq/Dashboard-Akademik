import assert from "node:assert/strict";
import test from "node:test";
import {
  konfirmasiCocok,
  KONFIRMASI_GAGAL,
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordSchema,
} from "./password-policy";

test("batas panjang adalah angka yang disepakati", () => {
  assert.equal(PASSWORD_MIN, 8);
  assert.equal(PASSWORD_MAX, 72);
});

test("password di bawah batas minimum ditolak", () => {
  // Sebelumnya 4 karakter, sehingga "abcd" adalah password yang valid.
  const hasil = passwordSchema.safeParse("abcd123");
  assert.equal(hasil.success, false);
  assert.match(hasil.error?.issues[0]?.message ?? "", /minimal 8 karakter/);
});

test("tepat 8 karakter diterima", () => {
  assert.equal(passwordSchema.safeParse("abcd1234").success, true);
});

test("password kosong ditolak", () => {
  assert.equal(passwordSchema.safeParse("").success, false);
});

test("tepat 72 karakter diterima, 73 ditolak", () => {
  assert.equal(passwordSchema.safeParse("a".repeat(PASSWORD_MAX)).success, true);
  const lebih = passwordSchema.safeParse("a".repeat(PASSWORD_MAX + 1));
  assert.equal(lebih.success, false);
  assert.match(lebih.error?.issues[0]?.message ?? "", /maksimal 72 karakter/);
});

test("password dengan spasi dihitung sebagai karakter", () => {
  assert.equal(passwordSchema.safeParse("        ").success, true);
});

test("pesan error menyebut batasnya, bukan 'tidak valid'", () => {
  // Operator perlu tahu harusnya berapa, bukan hanya bahwa gagal.
  const pesan = passwordSchema.safeParse("abc").error?.issues[0]?.message ?? "";
  assert.equal(pesan, `Password minimal ${PASSWORD_MIN} karakter`);
});

test("konfirmasi yang sama dianggap cocok", () => {
  assert.equal(konfirmasiCocok("abcd1234", "abcd1234"), true);
});

test("konfirmasi berbeda ditolak", () => {
  assert.equal(konfirmasiCocok("abcd1234", "abcd12345"), false);
  assert.equal(konfirmasiCocok("abcd1234", "ABCD1234"), false);
  assert.equal(konfirmasiCocok("abcd1234", "abcd1234 "), false);
});

test("konfirmasi yang tidak dikirim dianggap tidak cocok", () => {
  // Form bisa tidak terkirim bila nama field salah ketik. Nilai kosong tidak
  // boleh lolos hanya karena password-nya sendiri kosong.
  for (const hilang of [undefined, null, "", 0, false, [], {}]) {
    assert.equal(konfirmasiCocok("abcd1234", hilang), false);
  }
});

test("pesan konfirmasi berbahasa jelas dan konsisten", () => {
  assert.equal(KONFIRMASI_GAGAL, "Konfirmasi password tidak cocok");
});