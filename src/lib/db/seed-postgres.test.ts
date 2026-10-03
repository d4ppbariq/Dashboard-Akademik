import assert from "node:assert/strict";
import test from "node:test";
import { buildPostgresSeed } from "./seed-postgres";
import { hashPassword } from "@/lib/auth/password";

/**
 * Seed dibaca dari .env, jadi test ini mengubah process.env dan memulihkannya
 * setelah setiap kasus.
 */
const VARIABEL = [
  "SEED_SUPERADMIN_PASSWORD",
  "SEED_OPERATOR_PASSWORD",
  "SEED_GURU_PASSWORD",
] as const;

function withEnv(nilai: Partial<Record<(typeof VARIABEL)[number], string>>) {
  const sebelumnya = new Map<string, string | undefined>();
  for (const key of VARIABEL) {
    sebelumnya.set(key, process.env[key]);
    if (nilai[key] === undefined) delete process.env[key];
    else process.env[key] = nilai[key];
  }
  return () => {
    for (const [key, value] of sebelumnya) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test("seed menolak saat variabel password belum diisi", () => {
  const pulih = withEnv({});
  try {
    assert.throws(() => buildPostgresSeed(), /SEED_SUPERADMIN_PASSWORD/);
  } finally {
    pulih();
  }
});

test("seed menolak password yang terlalu pendek dan menyebut variabelnya", () => {
  const pulih = withEnv({
    SEED_SUPERADMIN_PASSWORD: "abcdefgh",
    SEED_OPERATOR_PASSWORD: "abcdefgh",
    SEED_GURU_PASSWORD: "abc",
  });
  try {
    assert.throws(
      () => buildPostgresSeed(),
      /SEED_GURU_PASSWORD[\s\S]*minimal 8 karakter/
    );
  } finally {
    pulih();
  }
});

test("tiga akun awal memakai password yang saling berbeda", () => {
  const pulih = withEnv({
    SEED_SUPERADMIN_PASSWORD: "superadmin-rahasia",
    SEED_OPERATOR_PASSWORD: "operator-rahasia",
    SEED_GURU_PASSWORD: "guru-rahasia",
  });
  try {
    const db = buildPostgresSeed();
    const hash = db.users.map((u) => u.password_hash);
    assert.equal(new Set(hash).size, 3, "hash operator dan guru tidak boleh sama");
  } finally {
    pulih();
  }
});

test("password awal disimpan sebagai hash, bukan teks polos", () => {
  const pulih = withEnv({
    SEED_SUPERADMIN_PASSWORD: "superadmin-rahasia",
    SEED_OPERATOR_PASSWORD: "operator-rahasia",
    SEED_GURU_PASSWORD: "guru-rahasia",
  });
  try {
    const db = buildPostgresSeed();
    const guru = db.users.find((u) => u.email === "guru@nesaciba.sch.id");
    assert.equal(guru?.password_hash, hashPassword("guru-rahasia"));
    for (const user of db.users) {
      assert.ok(
        !user.password_hash.includes("rahasia"),
        "password tidak boleh muncul di kolom hash"
      );
    }
  } finally {
    pulih();
  }
});

test("email akun awal tidak berubah", () => {
  const pulih = withEnv({
    SEED_SUPERADMIN_PASSWORD: "superadmin-rahasia",
    SEED_OPERATOR_PASSWORD: "operator-rahasia",
    SEED_GURU_PASSWORD: "guru-rahasia",
  });
  try {
    const db = buildPostgresSeed();
    assert.deepEqual(
      db.users.map((u) => `${u.email}:${u.role_id}`).sort(),
      [
        "guru@nesaciba.sch.id:role-guru",
        "operator@nesaciba.sch.id:role-operator",
        "superadmin@nesaciba.sch.id:role-superadmin",
      ]
    );
  } finally {
    pulih();
  }
});