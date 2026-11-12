import assert from "node:assert/strict";
import test from "node:test";
import { buildSeed } from "@/lib/db/seed";
import { hashPassword } from "./password";
import { changeOwnPassword } from "./change-password";

function fixture() {
  const db = buildSeed();
  db.users[0].password_hash = hashPassword("old-fixture-password");
  let writes = 0;
  const save = async () => { writes += 1; };
  const form = new FormData();
  form.set("current_password", "old-fixture-password");
  form.set("password", "new-fixture-password");
  form.set("password_confirm", "new-fixture-password");
  return { db, form, save, writes: () => writes };
}

test("superadmin changes only their own password and persists a secret-free audit", async () => {
  const f = fixture();
  const otherHash = f.db.users[1].password_hash;
  f.form.set("user_id", f.db.users[1].id);
  const result = await changeOwnPassword(f.db, "u-1", f.form, f.save);
  assert.deepEqual(result, { success: true });
  assert.equal(f.db.users[0].password_hash === hashPassword("new-fixture-password"), true);
  assert.equal(f.db.users[1].password_hash === otherHash, true);
  assert.equal(f.writes(), 1);
  assert.equal(f.db.audit_log.length, 1);
  assert.equal(f.db.audit_log[0].user_id, "u-1");
  assert.equal(f.db.audit_log[0].aksi, "UPDATE");
  const audit = JSON.stringify(f.db.audit_log);
  for (const secret of ["old-fixture-password", "new-fixture-password", f.db.users[0].password_hash]) {
    assert.equal(audit.includes(secret), false);
  }
});

for (const scenario of ["operator", "guru", "missing", "inactive", "deleted-role"] as const) {
  test(`denies ${scenario} from current database identity without mutation`, async () => {
    const f = fixture();
    let id = "u-1";
    if (scenario === "operator") id = "u-2";
    if (scenario === "guru") id = "u-3";
    if (scenario === "missing") id = "missing";
    if (scenario === "inactive") f.db.users[0].status_aktif = "NONAKTIF";
    if (scenario === "deleted-role") f.db.roles = [];
    const before = JSON.stringify(f.db);
    assert.deepEqual(await changeOwnPassword(f.db, id, f.form, f.save), { error: "Hanya superadmin aktif yang dapat mengganti password sendiri" });
    assert.equal(JSON.stringify(f.db) === before, true);
    assert.equal(f.writes(), 0);
  });
}

for (const [password, confirm, error] of [
  ["short", "short", "Password minimal 8 karakter"],
  ["x".repeat(73), "x".repeat(73), "Password maksimal 72 karakter"],
  [null, null, null],
  ["new-fixture-password", "different", "Konfirmasi password tidak cocok"],
  ["new-fixture-password", null, "Konfirmasi password tidak cocok"],
  ["old-fixture-password", "old-fixture-password", "Password baru harus berbeda dari password saat ini"],
] as const) {
  test(`rejects invalid new password case ${error ?? "missing"}`, async () => {
    const f = fixture();
    if (password === null) f.form.delete("password"); else f.form.set("password", password);
    if (confirm === null) f.form.delete("password_confirm"); else f.form.set("password_confirm", confirm);
    const before = JSON.stringify(f.db);
    const result = await changeOwnPassword(f.db, "u-1", f.form, f.save);
    assert.equal(typeof result.error, "string");
    if (error) assert.equal(result.error, error);
    assert.equal(JSON.stringify(f.db) === before, true);
    assert.equal(f.writes(), 0);
  });
}

for (const current of [null, "", "wrong-password"]) {
  test(`rejects ${current === null ? "missing" : current === "" ? "empty" : "incorrect"} current password without writing`, async () => {
    const f = fixture();
    if (current === null) f.form.delete("current_password");
    else f.form.set("current_password", current);
    const before = JSON.stringify(f.db);
    assert.deepEqual(await changeOwnPassword(f.db, "u-1", f.form, f.save), { error: "Password saat ini tidak cocok" });
    assert.equal(JSON.stringify(f.db) === before, true);
    assert.equal(f.writes(), 0);
  });
}
