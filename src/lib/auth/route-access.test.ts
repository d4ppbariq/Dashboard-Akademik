import assert from "node:assert/strict";
import test from "node:test";
import { canAccessRoute, SUPERADMIN_ROLE_ID } from "./route-access";
import type { RoleRoute, Route } from "@/lib/db/types";

function rute(
  path: string,
  method: Route["method"] = "GET",
  id = `route-${path}`
): Route {
  return { id, path, method, deskripsi: path };
}

const ROUTES: Route[] = [
  rute("/dashboard", "GET", "route-1"),
  rute("/kelas", "GET", "route-2"),
  rute("/master", "GET", "route-12"),
  rute("/api/master", "POST", "route-13"),
  rute("/api/master", "DELETE", "route-14"),
];

const ROLE_ROUTES: RoleRoute[] = [
  { role_id: "role-guru", route_id: "route-1" },
  { role_id: "role-guru", route_id: "route-2" },
  { role_id: "role-operator", route_id: "route-1" },
  { role_id: "role-operator", route_id: "route-13" },
  { role_id: "role-operator", route_id: "route-14" },
];

test("grant yang cocok memberi akses", () => {
  assert.equal(canAccessRoute(ROUTES, ROLE_ROUTES, "role-guru", "/kelas", "GET"), true);
});

test("role tanpa grant ditolak", () => {
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-guru", "/master", "GET"),
    false
  );
});

test("path yang tidak terdaftar ditolak, bukan dibuka untuk semua role", () => {
  // Fail-closed. Versi lama mengembalikan true di sini, sehingga halaman yang
  // lupa didaftarkan otomatis terbuka dan kekosongannya tidak terlihat.
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-guru", "/tidak-ada", "GET"),
    false
  );
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-operator", "/tidak-ada", "GET"),
    false
  );
});

test("method ikut diperiksa, bukan diabaikan", () => {
  // Operator punya /api/master pada POST dan DELETE, bukan pada GET.
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-operator", "/api/master", "POST"),
    true
  );
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-operator", "/api/master", "DELETE"),
    true
  );
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-operator", "/api/master", "GET"),
    false
  );
});

test("method yang sama pada path berbeda tidak saling menimpa", () => {
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-guru", "/master", "DELETE"),
    false
  );
});

test("grant milik role lain tidak dipakai", () => {
  // Guru tidak punya /master, meski operator punya.
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-guru", "/master", "GET"),
    false
  );
});

test("superadmin punya akses ke semua route terdaftar maupun tidak", () => {
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, SUPERADMIN_ROLE_ID, "/master", "GET"),
    true
  );
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, SUPERADMIN_ROLE_ID, "/tidak-ada", "GET"),
    true
  );
  assert.equal(
    canAccessRoute([], [], SUPERADMIN_ROLE_ID, "/tidak-ada", "DELETE"),
    true,
    "superadmin tidak boleh terkunci dari /admin/routes oleh tabel Route"
  );
});

test("tabel kosong menolak semua role selain superadmin", () => {
  assert.equal(canAccessRoute([], [], "role-guru", "/kelas", "GET"), false);
});

test("role yang tidak dikenal ditolak", () => {
  assert.equal(
    canAccessRoute(ROUTES, ROLE_ROUTES, "role-hantu", "/kelas", "GET"),
    false
  );
});