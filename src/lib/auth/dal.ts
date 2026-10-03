import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/store";
import { readSession } from "./session";
import { canAccessRoute } from "./route-access";
import type { Database, Menu, User } from "@/lib/db/types";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;
  const db = await getDb();
  const user = db.users.find((u) => u.id === session.userId);
  // status_aktif diperiksa di sini, bukan hanya saat login. Tanpa ini, akun
  // yang dinonaktifkan masih bisa memakai cookie lamanya sampai token
  // kedaluwarsa, sehingga toggleUserStatus tidak langsung mencabut akses.
  if (!user || user.status_aktif === "NONAKTIF") return null;
  return user;
});

export const requireAuth = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export async function requireRoute(
  path: string,
  method = "GET"
): Promise<User> {
  const user = await requireAuth();
  const db = await getDb();
  const canAccess = await hasRouteAccess(user.role_id, path, method, db);
  if (!canAccess) redirect("/dashboard");
  return user;
}

export const getMenusForRole = cache(
  async (roleId: string): Promise<Menu[]> => {
    const db = await getDb();
    const menuIds = new Set(
      db.role_menus.filter((rm) => rm.role_id === roleId).map((rm) => rm.menu_id)
    );
    return db.menus
      .filter((m) => menuIds.has(m.id))
      .sort((a, b) => a.urutan - b.urutan);
  }
);

export async function getPermissionCodesForRole(
  roleId: string,
  db: Database
): Promise<string[]> {
  const permissionIds = new Set(
    db.role_permissions
      .filter((rp) => rp.role_id === roleId)
      .map((rp) => rp.permission_id)
  );
  return db.permissions
    .filter((p) => permissionIds.has(p.id))
    .map((p) => p.kode_permission);
}

export async function hasPermission(
  user: User,
  kode: string,
  db?: Database
): Promise<boolean> {
  const current = db ?? (await getDb());
  const codes = await getPermissionCodesForRole(user.role_id, current);
  return codes.includes(kode);
}

export async function hasRouteAccess(
  roleId: string,
  path: string,
  method: string,
  db: Database
): Promise<boolean> {
  return canAccessRoute(db.routes, db.role_routes, roleId, path, method);
}
