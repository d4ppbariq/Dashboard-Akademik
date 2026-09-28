import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRow, normalizeRows } from "./normalize";
import type { AuditLog } from "./types";

const BARIS_AUDIT: Record<string, unknown> = {
  id: "audit-1",
  user_id: "usr-1",
  user_nama: "Guru",
  aksi: "LOGIN",
  entitas: "Auth",
  detail: "Berhasil",
  waktu: "2026-09-28T07:12:22.123Z",
};

test("kolom waktu dari driver pg diubah menjadi string ISO", () => {
  // pg mengubah TIMESTAMPTZ menjadi objek Date; ini penyebab
  // "waktu.localeCompare is not a function" di halaman audit log.
  const baris = { ...BARIS_AUDIT, waktu: new Date("2026-09-28T07:12:22.123Z") };
  const hasil = normalizeRow<AuditLog>(baris);
  assert.equal(typeof hasil.waktu, "string");
  assert.equal(hasil.waktu, "2026-09-28T07:12:22.123Z");
});

test("baris hasil normalisasi bisa diurutkan dengan localeCompare", () => {
  const baris = [
    { ...BARIS_AUDIT, id: "a", waktu: new Date("2026-09-27T07:00:00.000Z") },
    { ...BARIS_AUDIT, id: "b", waktu: new Date("2026-09-28T07:00:00.000Z") },
    { ...BARIS_AUDIT, id: "c", waktu: new Date("2026-09-26T07:00:00.000Z") },
  ];
  const urut = normalizeRows<AuditLog>(baris).sort((x, y) =>
    y.waktu.localeCompare(x.waktu)
  );
  assert.deepEqual(
    urut.map((l) => l.id),
    ["b", "a", "c"]
  );
});

test("waktu ISO yang sudah string tidak diubah", () => {
  const hasil = normalizeRow<AuditLog>({ ...BARIS_AUDIT });
  assert.equal(hasil.waktu, "2026-09-28T07:12:22.123Z");
});

test("kolom lain tidak tersentuh", () => {
  const hasil = normalizeRow<AuditLog>({
    ...BARIS_AUDIT,
    waktu: new Date("2026-09-28T07:12:22.123Z"),
  });
  assert.equal(hasil.id, "audit-1");
  assert.equal(hasil.user_nama, "Guru");
  assert.equal(hasil.aksi, "LOGIN");
});

test("angka dan boolean tetap utuh", () => {
  const hasil = normalizeRow<{ semester: number; nilai: number; status: boolean }>({
    semester: 2,
    nilai: 85,
    status: true,
  });
  assert.equal(typeof hasil.semester, "number");
  assert.equal(typeof hasil.nilai, "number");
  assert.equal(hasil.status, true);
});

test("null tidak diubah", () => {
  const hasil = normalizeRow<{ detail: string | null }>({ detail: null });
  assert.equal(hasil.detail, null);
});

test("baris asli tidak dimutasi", () => {
  const asli = { ...BARIS_AUDIT, waktu: new Date("2026-09-28T07:12:22.123Z") };
  const sebelum = asli.waktu;
  normalizeRow<AuditLog>(asli);
  assert.equal(asli.waktu, sebelum, "waktu harus tetap Date di baris asal");
  assert.ok(asli.waktu instanceof Date);
});

test("baris tanpa kolom waktu dikembalikan tanpa disalin", () => {
  const baris = { semester: 1, nilai: 90 };
  assert.equal(normalizeRow(baris), baris, "harus identitas yang sama");
});

test("normalizeRows menangani daftar kosong", () => {
  assert.deepEqual(normalizeRows([]), []);
});
