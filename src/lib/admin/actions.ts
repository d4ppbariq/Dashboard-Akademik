"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb, persist, newId } from "@/lib/db/store";
import { pushAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";

type Result = { error?: string };

async function guard(): Promise<{ user: Awaited<ReturnType<typeof requireAuth>>; ok: boolean }> {
  const user = await requireAuth();
  if (!(await hasPermission(user, "rbac.manage"))) {
    return { user, ok: false };
  }
  return { user, ok: true };
}

async function errorIfForbidden(): Promise<{ user: Awaited<ReturnType<typeof requireAuth>>; ok: boolean }> {
  return guard();
}

const UserSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.email({ message: "Email tidak valid" }),
  role_id: z.string().min(1, "Role wajib dipilih"),
  password: z.string().min(4, "Password minimal 4 karakter"),
});

const PermissionSchema = z.object({
  kode_permission: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9.]+$/, "Kode permission: huruf kecil, angka, dan titik"),
  deskripsi: z.string().trim().min(2, "Deskripsi minimal 2 karakter"),
});

const MenuSchema = z.object({
  nama_menu: z.string().trim().min(2, "Nama menu minimal 2 karakter"),
  path: z.string().trim().startsWith("/", "Path harus diawali /"),
  icon: z.string().trim().min(1, "Ikon wajib diisi"),
  urutan: z.number().int().min(1),
  grup: z.string().trim().min(1, "Grup wajib diisi"),
});

const RouteSchema = z.object({
  path: z.string().trim().min(1, "Path wajib diisi"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  deskripsi: z.string().trim().min(2, "Deskripsi minimal 2 karakter"),
});

function num(formData: FormData, key: string): number | null {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : null;
}

export async function createUser(formData: FormData): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const parsed = UserSchema.safeParse({
    nama: formData.get("nama"),
    email: formData.get("email"),
    role_id: formData.get("role_id"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.nama?.[0] ?? f.email?.[0] ?? f.role_id?.[0] ?? f.password?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  if (db.users.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase())) {
    return { error: "Email sudah terdaftar" };
  }

  db.users.push({
    id: newId("u", db.users),
    nama: parsed.data.nama,
    email: parsed.data.email,
    password_hash: hashPassword(parsed.data.password),
    role_id: parsed.data.role_id,
    status_aktif: "AKTIF",
  });

  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "CREATE",
    entitas: "user",
    detail: `Membuat user ${parsed.data.email} (${parsed.data.nama})`,
  });
  await persist(db);
  revalidatePath("/admin/users");
  return {};
}

export async function toggleUserStatus(userId: string): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { error: "User tidak ditemukan" };
  if (user.id === g.user.id) return { error: "Tidak dapat mengubah status akun sendiri" };

  user.status_aktif = user.status_aktif === "AKTIF" ? "NONAKTIF" : "AKTIF";
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "UPDATE",
    entitas: "user",
    detail: `Mengubah status ${user.email} menjadi ${user.status_aktif}`,
  });
  await persist(db);
  revalidatePath("/admin/users");
  return {};
}

export async function deleteUser(userId: string): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { error: "User tidak ditemukan" };
  if (user.id === g.user.id) return { error: "Tidak dapat menghapus akun sendiri" };

  const superadmins = db.users.filter((u) => u.role_id === "role-superadmin");
  if (user.role_id === "role-superadmin" && superadmins.length <= 1) {
    return { error: "Tidak dapat menghapus superadmin terakhir" };
  }

  db.users = db.users.filter((u) => u.id !== userId);
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "DELETE",
    entitas: "user",
    detail: `Menghapus user ${user.email}`,
  });
  await persist(db);
  revalidatePath("/admin/users");
  return {};
}

export async function createPermission(formData: FormData): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const parsed = PermissionSchema.safeParse({
    kode_permission: formData.get("kode_permission"),
    deskripsi: formData.get("deskripsi"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.kode_permission?.[0] ?? f.deskripsi?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  if (db.permissions.some((p) => p.kode_permission === parsed.data.kode_permission)) {
    return { error: "Kode permission sudah ada" };
  }

  db.permissions.push({ id: newId("perm", db.permissions), ...parsed.data });
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "CREATE",
    entitas: "permission",
    detail: `Menambahkan permission ${parsed.data.kode_permission}`,
  });
  await persist(db);
  revalidatePath("/admin/permissions");
  return {};
}

export async function deletePermission(permissionId: string): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  db.permissions = db.permissions.filter((p) => p.id !== permissionId);
  db.role_permissions = db.role_permissions.filter((rp) => rp.permission_id !== permissionId);
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "DELETE",
    entitas: "permission",
    detail: `Menghapus permission ${permissionId}`,
  });
  await persist(db);
  revalidatePath("/admin/permissions");
  return {};
}

export async function createMenu(formData: FormData): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const parsed = MenuSchema.safeParse({
    nama_menu: formData.get("nama_menu"),
    path: formData.get("path"),
    icon: formData.get("icon"),
    urutan: num(formData, "urutan"),
    grup: formData.get("grup"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.nama_menu?.[0] ?? f.path?.[0] ?? f.icon?.[0] ?? f.urutan?.[0] ?? f.grup?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  if (db.menus.some((m) => m.path === parsed.data.path)) {
    return { error: "Path menu sudah dipakai" };
  }
  db.menus.push({ id: newId("menu", db.menus), ...parsed.data });
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "CREATE",
    entitas: "menu",
    detail: `Menambahkan menu ${parsed.data.path}`,
  });
  await persist(db);
  revalidatePath("/admin/menus");
  return {};
}

export async function deleteMenu(menuId: string): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  db.menus = db.menus.filter((m) => m.id !== menuId);
  db.role_menus = db.role_menus.filter((rm) => rm.menu_id !== menuId);
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "DELETE",
    entitas: "menu",
    detail: `Menghapus menu ${menuId}`,
  });
  await persist(db);
  revalidatePath("/admin/menus");
  return {};
}

export async function createRoute(formData: FormData): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const parsed = RouteSchema.safeParse({
    path: formData.get("path"),
    method: formData.get("method"),
    deskripsi: formData.get("deskripsi"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: f.path?.[0] ?? f.method?.[0] ?? f.deskripsi?.[0] ?? "Data tidak valid" };
  }

  const db = await getDb();
  if (db.routes.some((r) => r.path === parsed.data.path && r.method === parsed.data.method)) {
    return { error: "Rute dengan method tersebut sudah ada" };
  }
  db.routes.push({ id: newId("route", db.routes), ...parsed.data });
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "CREATE",
    entitas: "route",
    detail: `Menambahkan rute ${parsed.data.method} ${parsed.data.path}`,
  });
  await persist(db);
  revalidatePath("/admin/routes");
  return {};
}

export async function deleteRoute(routeId: string): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  db.routes = db.routes.filter((r) => r.id !== routeId);
  db.role_routes = db.role_routes.filter((rr) => rr.route_id !== routeId);
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: "DELETE",
    entitas: "route",
    detail: `Menghapus rute ${routeId}`,
  });
  await persist(db);
  revalidatePath("/admin/routes");
  return {};
}

export async function setRolePermission(
  roleId: string,
  permissionId: string,
  assigned: boolean
): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  if (assigned) {
    if (!db.role_permissions.some((rp) => rp.role_id === roleId && rp.permission_id === permissionId)) {
      db.role_permissions.push({ role_id: roleId, permission_id: permissionId });
    }
  } else {
    db.role_permissions = db.role_permissions.filter(
      (rp) => !(rp.role_id === roleId && rp.permission_id === permissionId)
    );
  }
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: assigned ? "UPDATE" : "DELETE",
    entitas: "role_permission",
    detail: `${assigned ? "Menambahkan" : "Menghapus"} permission ${permissionId} pada role ${roleId}`,
  });
  await persist(db);
  revalidatePath("/admin/roles");
  return {};
}

export async function setRoleMenu(
  roleId: string,
  menuId: string,
  assigned: boolean
): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  if (assigned) {
    if (!db.role_menus.some((rm) => rm.role_id === roleId && rm.menu_id === menuId)) {
      db.role_menus.push({ role_id: roleId, menu_id: menuId });
    }
  } else {
    db.role_menus = db.role_menus.filter(
      (rm) => !(rm.role_id === roleId && rm.menu_id === menuId)
    );
  }
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: assigned ? "UPDATE" : "DELETE",
    entitas: "role_menu",
    detail: `${assigned ? "Menambahkan" : "Menghapus"} menu ${menuId} pada role ${roleId}`,
  });
  await persist(db);
  revalidatePath("/admin/roles");
  return {};
}

export async function setRoleRoute(
  roleId: string,
  routeId: string,
  assigned: boolean
): Promise<Result> {
  const g = await errorIfForbidden();
  if (!g.ok) return { error: "Tidak memiliki izin" };

  const db = await getDb();
  if (assigned) {
    if (!db.role_routes.some((rr) => rr.role_id === roleId && rr.route_id === routeId)) {
      db.role_routes.push({ role_id: roleId, route_id: routeId });
    }
  } else {
    db.role_routes = db.role_routes.filter(
      (rr) => !(rr.role_id === roleId && rr.route_id === routeId)
    );
  }
  pushAudit(db, {
    user_id: g.user.id,
    user_nama: g.user.nama,
    aksi: assigned ? "UPDATE" : "DELETE",
    entitas: "role_route",
    detail: `${assigned ? "Menambahkan" : "Menghapus"} rute ${routeId} pada role ${roleId}`,
  });
  await persist(db);
  revalidatePath("/admin/roles");
  return {};
}
