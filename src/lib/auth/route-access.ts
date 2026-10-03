import type { RoleRoute, Route } from "@/lib/db/types";

/**
 * Keputusan akses rute, tanpa I/O, supaya bisa diuji tanpa database.
 * dal.ts yang membungkus fungsi ini dengan pembacaan tabel.
 */

/**
 * Superadmin tidak dikunci oleh tabel Route. Alasannya operasional: revoke
 * akses di /admin/routes tidak boleh membuat superadmin terkunci dari halaman
 * itu sendiri, karena tidak ada lagi jalur untuk membuka akses kembali.
 * Role ini tetap tercatat penuh di tabel RoleRoute oleh seed.
 */
export const SUPERADMIN_ROLE_ID = "role-superadmin";

/**
 * Fail-closed: path yang tidak terdaftar di tabel Route berarti TIDAK boleh
 * diakses. Versi sebelumnya mengembalikan true, sehingga setiap halaman yang
 * lupa didaftarkan otomatis terbuka untuk semua role dan kekosongannya tidak
 * terlihat, bahkan oleh superadmin yang memang punya akses di semua route.
 *
 * Konsekuensinya harus dipahami: menambah halaman baru berarti menambah baris
 * Route (dan RoleRoute untuk role yang boleh), lewat seed atau migrasi.
 */
export function canAccessRoute(
  routes: Route[],
  roleRoutes: RoleRoute[],
  roleId: string,
  path: string,
  method: string
): boolean {
  if (roleId === SUPERADMIN_ROLE_ID) return true;

  // Method ikut diperiksa. Kolomnya sebelumnya diabaikan, sehingga grant
  // "GET /x" secara implisit berarti grant untuk method apa pun pada path itu.
  const route = routes.find((r) => r.path === path && r.method === method);
  if (!route) return false;

  return roleRoutes.some((rr) => rr.role_id === roleId && rr.route_id === route.id);
}