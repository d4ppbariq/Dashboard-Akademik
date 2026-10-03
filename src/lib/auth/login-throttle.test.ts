import assert from "node:assert/strict";
import test from "node:test";
import { createLoginThrottle } from "./login-throttle";

/** Jam palsu supaya jendela waktu bisa diuji tanpa menunggu. */
function jamAwal(mulai = 1_000_000) {
  let sekarang = mulai;
  return {
    now: () => sekarang,
    maju(ms: number) {
      sekarang += ms;
    },
  };
}

const JENDELA = 15 * 60 * 1000;

function throttleDenganJam(jam: ReturnType<typeof jamAwal>, maksKunci?: number) {
  return createLoginThrottle({
    maxPercobaanPerAkun: 5,
    maxPercobaanPerIp: 20,
    windowMs: JENDELA,
    now: jam.now,
    ...(maksKunci === undefined ? {} : { maksKunci }),
  });
}

test("percobaan pertama diizinkan", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  const hasil = t.periksa("guru@sch.id", "10.0.0.1");
  assert.equal(hasil.allowed, true);
  assert.equal(hasil.sisa, 5);
});

test("lima kali gagal lalu ditolak", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 5; i++) {
    assert.equal(t.periksa("guru@sch.id", "10.0.0.1").allowed, true, `percobaan ${i + 1}`);
    t.catatGagal("guru@sch.id", "10.0.0.1");
  }
  const ditolak = t.periksa("guru@sch.id", "10.0.0.1");
  assert.equal(ditolak.allowed, false);
  assert.equal(ditolak.sisa, 0);
  assert.ok(ditolak.tungguDetik > 0);
});

test("pesan menunggu memberi angka detik yang masuk akal", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 5; i++) t.catatGagal("guru@sch.id", "10.0.0.1");
  jam.maju(5 * 60 * 1000);
  const hasil = t.periksa("guru@sch.id", "10.0.0.1");
  assert.equal(hasil.allowed, false);
  assert.equal(hasil.tungguDetik, 10 * 60, "setelah 5 menit dari jendela 15 menit");
});

test("kunci dilepas setelah jendela berakhir", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 5; i++) t.catatGagal("guru@sch.id", "10.0.0.1");
  assert.equal(t.periksa("guru@sch.id", "10.0.0.1").allowed, false);

  jam.maju(JENDELA);
  const setelah = t.periksa("guru@sch.id", "10.0.0.1");
  assert.equal(setelah.allowed, true, "jendela baru harus mengizinkan lagi");
  assert.equal(setelah.sisa, 5, "penghitung dimulai dari nol");
});

test("batas per akun tidak bisa dilewati dengan mengubah IP", () => {
  // X-Forwarded-For bisa dipalsukan tanpa reverse proxy. Karena itu penghitung
  // per akun diperiksa terpisah dan tidak bergantung pada IP.
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 5; i++) {
    t.catatGagal("guru@sch.id", `10.0.0.${i}`);
  }
  assert.equal(t.periksa("guru@sch.id", "10.0.0.99").allowed, false);
});

test("email lain dari IP yang sama tidak ikut terkunci", () => {
  // Batas per akun: 5. Batas per IP: 20. Lima kegagalan pada satu akun tidak
  // boleh memblokir akun lain di perangkat yang sama.
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 5; i++) t.catatGagal("guru@sch.id", "10.0.0.1");
  assert.equal(t.periksa("operator@sch.id", "10.0.0.1").allowed, true);
});

test("batas per IP menahan spray ke banyak akun", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 20; i++) t.catatGagal(`siswa${i}@sch.id`, "10.0.0.1");
  const hasil = t.periksa("orang-baru@sch.id", "10.0.0.1");
  assert.equal(hasil.allowed, false, "IP kena batas 20 percobaan");
});

test("perbandingan email mengabaikan huruf besar", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 5; i++) t.catatGagal("Guru@Sch.ID", "10.0.0.1");
  assert.equal(t.periksa("guru@sch.id", "10.0.0.1").allowed, false);
});

test("reset setelah login berhasil menghapus kedua penghitung", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 5; i++) t.catatGagal("guru@sch.id", "10.0.0.1");
  t.reset("guru@sch.id", "10.0.0.1");
  assert.equal(t.periksa("guru@sch.id", "10.0.0.1").allowed, true);
  assert.equal(t.periksa("guru@sch.id", "10.0.0.1").sisa, 5);
});

test("jendela baru dimulai ulang, bukan melanjutkan penghitung", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam);
  for (let i = 0; i < 4; i++) t.catatGagal("guru@sch.id", "10.0.0.1");
  jam.maju(JENDELA);
  t.catatGagal("guru@sch.id", "10.0.0.1");
  assert.equal(
    t.periksa("guru@sch.id", "10.0.0.1").allowed,
    true,
    "1 kegagalan di jendela baru bukan 5"
  );
});

test("penyerang tidak bisa menumpuk kunci lewat email acak", () => {
  const jam = jamAwal();
  const t = throttleDenganJam(jam, 10);
  for (let i = 0; i < 100; i++) t.catatGagal(`spam${i}@sch.id`, `10.0.0.${i % 250}`);
  // Yang diuji: jumlah kunci dibatasi, sehingga email acak tidak membuat
  // memori tumbuh tanpa batas dan email lama ikut dilepas.
  assert.doesNotThrow(() => t.periksa("baru@sch.id", "10.0.0.250"));
});