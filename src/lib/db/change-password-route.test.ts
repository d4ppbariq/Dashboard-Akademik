import assert from "node:assert/strict";
import test from "node:test";
import { buildPostgresSeed } from "./seed-postgres";

test("fresh installs register password page and navigation for superadmin only", () => {
  const keys = ["SEED_SUPERADMIN_PASSWORD", "SEED_OPERATOR_PASSWORD", "SEED_GURU_PASSWORD"];
  const original = keys.map((key) => process.env[key]);
  try {
    keys.forEach((key) => { process.env[key] = "fixture-seed-password"; });
    const db = buildPostgresSeed();
    const route = db.routes.find((r) => r.path === "/ganti-password" && r.method === "GET");
    const menu = db.menus.find((m) => m.path === "/ganti-password");
    assert.ok(route);
    assert.ok(menu);
    assert.deepEqual(db.role_routes.filter((r) => r.route_id === route.id).map((r) => r.role_id), ["role-superadmin"]);
    assert.deepEqual(db.role_menus.filter((m) => m.menu_id === menu.id).map((m) => m.role_id), ["role-superadmin"]);
  } finally {
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});
