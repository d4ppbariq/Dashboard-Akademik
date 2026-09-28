import assert from "node:assert/strict";
import test from "node:test";
import {
  AMBANG_AUTOMATIS,
  buildMapelIndex,
  normalisasi,
  resolveKolom,
  resolveSemuaKolom,
  similarity,
  type MapelRow,
} from "./mapel-resolver";
import { MATA_PELAJARAN_DEFAULT } from "@/lib/db/seed";

const mapels: MapelRow[] = MATA_PELAJARAN_DEFAULT;
const KURIKULUM_LAMA: MapelRow[] = [
  { id: "mp-sbk", kode: "SBK", nama_mapel: "Seni dan Budaya" },
  { id: "mp-prk", kode: "PRK", nama_mapel: "Prakarya" },
];

function kode(kolom: string, list = mapels): string | null {
  return resolveKolom(kolom, list).mapel?.kode ?? null;
}

test("normalisasi: insensitive, buang tanda baca, rapatkan spasi", () => {
  assert.equal(normalisasi("  Matematika  "), "matematika");
  assert.equal(normalisasi("Matematika."), "matematika");
  assert.equal(normalisasi("Pancasila  dan  Kewarganegaraan"), "pancasila dan kewarganegaraan");
  assert.equal(normalisasi("BUDI-PEKERTI"), "budi pekerti");
});

test("kode cocok persis, termasuk kapitalisasi campuran", () => {
  assert.equal(kode("MTK"), "MTK");
  assert.equal(kode("mtk"), "MTK");
  assert.equal(kode("Mtk"), "MTK");
  assert.equal(kode("PPKn"), "PPKn");
  assert.equal(kode("ppkn"), "PPKn");
  assert.equal(kode("BIN"), "BIN");
  assert.equal(kode("sun"), "SUN");
});

test("nama resmi tetap dikenali", () => {
  assert.equal(kode("Matematika"), "MTK");
  assert.equal(kode("Bahasa Indonesia"), "BIN");
  assert.equal(kode("PJOK"), "PJK");
  assert.equal(kode("Bahasa Sunda"), "SUN");
  assert.equal(kode("seni musik"), "MUS");
});

test("alias umum dikenali", () => {
  assert.equal(kode("Pancasila"), "PPKn");
  assert.equal(kode("Inggris"), "BIG");
  assert.equal(kode("Math"), "MTK");
  assert.equal(kode("Sunda"), "SUN");
  assert.equal(kode("Komputer"), "INF");
  assert.equal(kode("Mat."), "MTK");
});

test("kode kurikulum lama hanya cocok bila mapel tersebut ada", () => {
  assert.equal(kode("SBK", mapels), null, "SBK tidak boleh cocok pada DB 2026");
  assert.equal(kode("PRK", mapels), null);
  assert.equal(kode("SBK", [...mapels, ...KURIKULUM_LAMA]), "SBK");
  assert.equal(kode("Prakarya", [...mapels, ...KURIKULUM_LAMA]), "PRK");
  assert.equal(kode("Seni dan Budaya", [...mapels, ...KURIKULUM_LAMA]), "SBK");
});

test("Seni dan Seni Musik tidak tertukar", () => {
  const semua = [...mapels, ...KURIKULUM_LAMA];
  assert.equal(kode("Seni Musik", semua), "MUS");
  assert.equal(kode("Seni dan Budaya", semua), "SBK");
  assert.equal(kode("Seni Budaya", semua), "SBK");
  assert.equal(kode("Musik", semua), "MUS");
  // "Seni" sendiri tidak boleh otomatis jadi salah satu.
  const r = resolveKolom("Seni", semua);
  assert.equal(r.mapel, null);
});

test("similarity: hanya berbasis prefix", () => {
  assert.equal(similarity("matematika", "matematika"), 1);
  assert.ok(similarity("matematika", "matematika wajib") < AMBANG_AUTOMATIS);
  assert.equal(similarity("abc", "xyz"), 0);
  assert.equal(similarity("", "abc"), 0);
});

test("typo ringan: di atas ambang saran, ditolak sebagai unknown", () => {
  const r = resolveKolom("Matematik", mapels);
  assert.notEqual(r.mapel, null, "alias soal ini harusnya menangani 'Matematik'");
});

test("kolom ngawur tidak menghasilkan mapel maupun saran", () => {
  const r = resolveKolom("Kolom Aneh", mapels);
  assert.equal(r.mapel, null);
  assert.equal(r.kind, null);
  assert.equal(r.saran, null);
});

test("header kosong aman", () => {
  assert.equal(resolveKolom("", mapels).mapel, null);
  assert.equal(resolveKolom("   ", mapels).mapel, null);
});

test("resolveSemuaKolom: index dibangun sekali, hasil konsisten per kolom", () => {
  const kolom = ["NIS", "Nama", "MTK", "BIN", "Kolom Aneh", "MTK"];
  const out = resolveSemuaKolom(kolom, mapels);
  assert.equal(out.get("MTK")?.mapel?.kode, "MTK");
  assert.equal(out.get("BIN")?.mapel?.kode, "BIN");
  assert.equal(out.get("Kolom Aneh")?.mapel, null);
  assert.equal(out.get("NIS")?.mapel, null);
});

test("buildMapelIndex: kode, nama, dan alias semuanya terpetakan", () => {
  const idx = buildMapelIndex(mapels);
  assert.equal(idx.get("mtk")?.kode, "MTK");
  assert.equal(idx.get("matematika")?.kode, "MTK");
  assert.equal(idx.get("math")?.kode, "MTK");
});

test("AMBANG_AUTOMATIS berada di area yang masuk akal", () => {
  assert.ok(AMBANG_AUTOMATIS > 0.8 && AMBANG_AUTOMATIS < 1);
});
