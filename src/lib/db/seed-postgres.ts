import type { Database } from "./types";
import { MATA_PELAJARAN_DEFAULT } from "./seed";

// sha256("26adm0828")
export const HASH_SUPERADMIN =
  "f4e1906a47b30e2f266c0d843661994812d532a9286af45c1b158c04eaf07b6e";
// sha256("admin")
export const HASH_ADMIN =
  "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

/**
 * Seed awal untuk PostgreSQL.
 * Yang diisi: RBAC (role, user, permission, menu, route, mapping) + mapel default.
 * Data akademik (angkatan/kelas/siswa/nilai/kehadiran) SENGAJA dibiarkan kosong
 * dan akan diisi langsung oleh operator melalui sistem.
 */
export function buildPostgresSeed(): Database {
  const roles = [
    { id: "role-superadmin", nama_role: "Superadmin", deskripsi: "Akses penuh seluruh sistem", is_system: true },
    { id: "role-operator", nama_role: "Operator", deskripsi: "Mengelola data akademik, kehadiran, dan master data", is_system: true },
    { id: "role-guru", nama_role: "Guru", deskripsi: "Read-only: memantau performa akademik dan kehadiran", is_system: true },
  ];

  const users = [
    {
      id: "u-1",
      nama: "Superadmin Nesaciba",
      email: "superadmin@nesaciba.sch.id",
      password_hash: HASH_SUPERADMIN, // sha256("26adm0828")
      role_id: "role-superadmin",
      status_aktif: "AKTIF" as const,
    },
    {
      id: "u-2",
      nama: "Operator Akademik",
      email: "operator@nesaciba.sch.id",
      password_hash: HASH_ADMIN, // sha256("admin")
      role_id: "role-operator",
      status_aktif: "AKTIF" as const,
    },
    {
      id: "u-3",
      nama: "Guru (Akun Umum)",
      email: "guru@nesaciba.sch.id",
      password_hash: HASH_ADMIN, // sha256("admin")
      role_id: "role-guru",
      status_aktif: "AKTIF" as const,
    },
  ];

  const permissions = [
    { id: "perm-1", kode_permission: "nilai.read", deskripsi: "Membaca data nilai" },
    { id: "perm-2", kode_permission: "nilai.write", deskripsi: "Menulis data nilai" },
    { id: "perm-3", kode_permission: "kehadiran.read", deskripsi: "Membaca data kehadiran" },
    { id: "perm-4", kode_permission: "kehadiran.write", deskripsi: "Menulis data kehadiran" },
    { id: "perm-5", kode_permission: "siswa.read", deskripsi: "Membaca data siswa" },
    { id: "perm-6", kode_permission: "siswa.write", deskripsi: "Menulis data siswa" },
    { id: "perm-7", kode_permission: "master.write", deskripsi: "Menulis master data (angkatan, kelas, mapel)" },
    { id: "perm-8", kode_permission: "import.execute", deskripsi: "Melakukan impor data Excel" },
    { id: "perm-9", kode_permission: "rbac.manage", deskripsi: "Mengelola user, role, menu, rute, permission" },
    { id: "perm-10", kode_permission: "audit.read", deskripsi: "Membaca audit log" },
  ];

  const menus = [
    { id: "menu-dashboard", nama_menu: "Dashboard Utama", path: "/dashboard", icon: "LayoutDashboard", urutan: 1, grup: "Analitik" },
    { id: "menu-kelas", nama_menu: "Rekap Akademik", path: "/kelas", icon: "Users", urutan: 2, grup: "Analitik" },
    { id: "menu-siswa", nama_menu: "Pencarian Siswa", path: "/siswa", icon: "UserSearch", urutan: 3, grup: "Analitik" },
    { id: "menu-preview", nama_menu: "Preview Data", path: "/preview", icon: "Eye", urutan: 4, grup: "Analitik" },
    { id: "menu-import", nama_menu: "Import Data Excel", path: "/import", icon: "FileSpreadsheet", urutan: 5, grup: "Data" },
    { id: "menu-akademik", nama_menu: "Kelola Data Siswa", path: "/akademik", icon: "Database", urutan: 6, grup: "Data" },
    { id: "menu-master", nama_menu: "Master Data", path: "/master", icon: "BookOpen", urutan: 7, grup: "Data" },
    { id: "menu-audit", nama_menu: "Audit Log", path: "/audit", icon: "ScrollText", urutan: 8, grup: "Sistem" },
    { id: "menu-users", nama_menu: "Manajemen User", path: "/admin/users", icon: "UserCog", urutan: 9, grup: "Sistem" },
    { id: "menu-roles", nama_menu: "Manajemen Role", path: "/admin/roles", icon: "ShieldCheck", urutan: 10, grup: "Sistem" },
    { id: "menu-permissions", nama_menu: "Manajemen Permission", path: "/admin/permissions", icon: "KeyRound", urutan: 11, grup: "Sistem" },
    { id: "menu-menus", nama_menu: "Manajemen Menu", path: "/admin/menus", icon: "MenuSquare", urutan: 12, grup: "Sistem" },
    { id: "menu-routes", nama_menu: "Manajemen Rute", path: "/admin/routes", icon: "Waypoints", urutan: 13, grup: "Sistem" },
  ];

  const routes = [
    { id: "route-1", path: "/dashboard", method: "GET" as const, deskripsi: "Dashboard utama level angkatan" },
    { id: "route-2", path: "/kelas", method: "GET" as const, deskripsi: "Analisis per kelas" },
    { id: "route-3", path: "/siswa", method: "GET" as const, deskripsi: "Pencarian siswa" },
    { id: "route-4", path: "/preview", method: "GET" as const, deskripsi: "Preview data impor" },
    { id: "route-5", path: "/import", method: "GET" as const, deskripsi: "Halaman impor Excel" },
    { id: "route-6", path: "/api/import", method: "POST" as const, deskripsi: "Unggah dan simpan impor Excel" },
    { id: "route-7", path: "/api/import/template", method: "GET" as const, deskripsi: "Unduh template Excel" },
    { id: "route-8", path: "/akademik", method: "GET" as const, deskripsi: "Kelola data akademik" },
    { id: "route-9", path: "/api/akademik", method: "POST" as const, deskripsi: "Simpan data akademik manual" },
    { id: "route-10", path: "/api/akademik", method: "PUT" as const, deskripsi: "Ubah data akademik manual" },
    { id: "route-11", path: "/api/akademik", method: "DELETE" as const, deskripsi: "Hapus data akademik manual" },
    { id: "route-12", path: "/master", method: "GET" as const, deskripsi: "Master data angkatan, kelas, mapel" },
    { id: "route-13", path: "/api/master", method: "POST" as const, deskripsi: "Simpan master data" },
    { id: "route-14", path: "/api/master", method: "DELETE" as const, deskripsi: "Hapus master data" },
    { id: "route-15", path: "/audit", method: "GET" as const, deskripsi: "Audit log" },
    { id: "route-16", path: "/admin/users", method: "GET" as const, deskripsi: "Manajemen user" },
    { id: "route-17", path: "/admin/roles", method: "GET" as const, deskripsi: "Manajemen role" },
    { id: "route-18", path: "/admin/permissions", method: "GET" as const, deskripsi: "Manajemen permission" },
    { id: "route-19", path: "/admin/menus", method: "GET" as const, deskripsi: "Manajemen menu" },
    { id: "route-20", path: "/admin/routes", method: "GET" as const, deskripsi: "Manajemen rute" },
    { id: "route-21", path: "/api/rbac", method: "POST" as const, deskripsi: "Simpan konfigurasi RBAC" },
    { id: "route-22", path: "/api/rbac", method: "DELETE" as const, deskripsi: "Hapus konfigurasi RBAC" },
  ];

  const role_permissions = [
    ...permissions.map((p) => ({ role_id: "role-superadmin" as const, permission_id: p.id })),
    { role_id: "role-operator", permission_id: "perm-1" },
    { role_id: "role-operator", permission_id: "perm-2" },
    { role_id: "role-operator", permission_id: "perm-3" },
    { role_id: "role-operator", permission_id: "perm-4" },
    { role_id: "role-operator", permission_id: "perm-5" },
    { role_id: "role-operator", permission_id: "perm-6" },
    { role_id: "role-operator", permission_id: "perm-7" },
    { role_id: "role-operator", permission_id: "perm-8" },
    { role_id: "role-operator", permission_id: "perm-10" },
    { role_id: "role-guru", permission_id: "perm-1" },
    { role_id: "role-guru", permission_id: "perm-3" },
    { role_id: "role-guru", permission_id: "perm-5" },
  ];

  const role_menus = [
    ...menus.map((m) => ({ role_id: "role-superadmin", menu_id: m.id })),
    ...[
      "menu-dashboard", "menu-kelas", "menu-siswa", "menu-preview", "menu-import",
      "menu-akademik", "menu-master", "menu-audit",
    ].map((menu_id) => ({ role_id: "role-operator", menu_id })),
    ...["menu-dashboard", "menu-kelas", "menu-siswa"].map((menu_id) => ({
      role_id: "role-guru",
      menu_id,
    })),
  ];

  const role_routes = [
    ...routes.map((r) => ({ role_id: "role-superadmin", route_id: r.id })),
    ...[
      "route-1", "route-2", "route-3", "route-4", "route-5", "route-6", "route-7",
      "route-8", "route-9", "route-10", "route-11", "route-12", "route-13", "route-14",
      "route-15",
    ].map((route_id) => ({ role_id: "role-operator", route_id })),
    ...["route-1", "route-2", "route-3"].map((route_id) => ({ role_id: "role-guru", route_id })),
  ];

  return {
    roles,
    users,
    permissions,
    menus,
    routes,
    role_permissions,
    role_menus,
    role_routes,
    angkatan: [],
    kelas: [],
    siswa: [],
    mata_pelajaran: MATA_PELAJARAN_DEFAULT,
    nilai_siswa: [],
    kehadiran_siswa: [],
    audit_log: [],
  };
}
