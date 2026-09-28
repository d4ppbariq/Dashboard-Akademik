import assert from "node:assert/strict";
import test from "node:test";
import { chunkSizeFor, insertRows, type TableData } from "./write";
import { IdAllocator, createIdAllocator, newId } from "./id";
import type { Database } from "./types";

type Capture = { text: string; values: unknown[] };

export function emptyDatabase(): Database {
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

function fakeQuery(sink: Capture[]) {
  return async (text: string, values: unknown[] = []) => {
    sink.push({ text, values });
    return { rows: [] } as never;
  };
}

function table(name: string, columns: string[], rowCount: number): TableData {
  const rows = Array.from({ length: rowCount }, (_, i) =>
    Object.fromEntries(columns.map((c, ci) => [c, `${c}-${i}-${ci}`]))
  );
  return { name, columns, rows };
}

test("chunkSizeFor: 5 kolom sesuai batas 65.535 parameter", () => {
  const size = chunkSizeFor(5);
  assert.ok(size > 0);
  assert.ok(size * 5 <= 60_000, "per chunk tidak boleh melebihi batas");
  assert.equal(size, 12_000);
  // Batas PostgreSQL 65.535 harus terlampaui oleh ukuran chunk lama.
  assert.ok(size < 13_107);
});

test("chunkSizeFor: kolom banyak tidak pernah menghasilkan 0", () => {
  assert.equal(chunkSizeFor(100_000), 1);
  assert.equal(chunkSizeFor(0), 60_000);
});

test("insertRows: memecah rows besar dan tidak pernah melebihi batas parameter", async () => {
  const cols = ["id", "siswa_id", "mata_pelajaran_id", "semester", "nilai"];
  const t = table("NilaiSiswa", cols, 13_107);
  const sink: Capture[] = [];

  await insertRows(fakeQuery(sink), t);

  assert.equal(sink.length, 2, "13.107 baris harus dipecah menjadi 2 statement");
  for (const call of sink) {
    assert.ok(call.values.length <= 60_000, "tiap statement di bawah batas");
    assert.ok(call.values.length <= 65_535);
  }
  const total = sink.reduce((n, c) => n + c.values.length, 0);
  assert.equal(total, 13_107 * 5, "tidak ada baris yang hilang");
});

test("insertRows: penomoran parameter dimulai ulang tiap chunk", async () => {
  const t = table("NilaiSiswa", ["id", "a"], 5);
  const sink: Capture[] = [];
  await insertRows(fakeQuery(sink), { ...t, rows: t.rows.slice(0, 3) });
  assert.match(sink[0].text, /\$1/);
  assert.match(sink[0].text, /\$6/);
  assert.ok(!sink[0].text.includes("$7"), "tidak ada parameter lebih dari jumlah baris");
});

test("insertRows: tabel kosong tidak menghasilkan query", async () => {
  const sink: Capture[] = [];
  await insertRows(fakeQuery(sink), { name: "Role", columns: ["id"], rows: [] });
  assert.equal(sink.length, 0);
});

test("insertRows: boundary tepat pada kelipatan chunk", async () => {
  const cols = ["id", "a", "b", "c", "d", "e"];
  const size = chunkSizeFor(cols.length);
  const t = table("NilaiSiswa", cols, size);
  const sink: Capture[] = [];
  await insertRows(fakeQuery(sink), t);
  assert.equal(sink.length, 1, "tepat sama ukurannya tidak menambah chunk kosong");
  assert.equal(sink[0].values.length, size * cols.length);
});

test("IdAllocator: id unik dan tercatat", () => {
  const a = new IdAllocator();
  const ids = new Set<string>();
  for (let i = 0; i < 20_000; i += 1) {
    const id = a.next("n");
    assert.ok(!ids.has(id), "id tidak boleh berulang");
    ids.add(id);
  }
  assert.equal(ids.size, 20_000);
});

test("IdAllocator: menghormati id yang di-reserve", () => {
  const a = new IdAllocator();
  a.reserve("n", "n-fixed-1");
  assert.equal(a.next("n") === "n-fixed-1", false);
});

test("IdAllocator: prefix berbeda tidak saling bertabrakan", () => {
  const a = new IdAllocator();
  const s = a.next("s");
  const n = a.next("n");
  assert.notEqual(s, n);
  assert.ok(s.startsWith("s-"));
  assert.ok(n.startsWith("n-"));
});

test("createIdAllocator: mengingat id yang sudah ada di database", () => {
  const db = {
    ...emptyDatabase(),
    siswa: [{ id: "s-1" }, { id: "s-2" }],
    nilai_siswa: [{ id: "n-1" }],
  } as Database;

  const a = createIdAllocator(db);
  const s = a.next("s");
  const n = a.next("n");
  assert.notEqual(s, "s-1");
  assert.notEqual(s, "s-2");
  assert.notEqual(n, "n-1");
});

test("createIdAllocator: tahan terhadap koleksi yang tidak tersedia", () => {
  const a = createIdAllocator({ siswa: [{ id: "s-1" }] } as unknown as Database);
  assert.match(a.next("s"), /^s-/);
});

test("newId: format dipertahankan dan tidak bentrok dengan list", () => {
  assert.match(newId("s"), /^s-[a-z0-9]+-[a-z0-9]{1,6}$/);
  assert.notEqual(newId("s", [{ id: "s-1" }]), "s-1");
});
