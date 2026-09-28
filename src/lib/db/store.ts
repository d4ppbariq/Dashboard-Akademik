import "server-only";
import { getPool } from "./connection";
import { writeDatabase } from "./write";
import { buildPostgresSeed } from "./seed-postgres";
import { normalizeRows } from "./normalize";
import type {
  Database,
  Role,
  User,
  Permission,
  Menu,
  Route,
  RolePermission,
  RoleMenu,
  RoleRoute,
  Angkatan,
  Kelas,
  Siswa,
  MataPelajaran,
  NilaiSiswa,
  KehadiranSiswa,
  AuditLog,
} from "./types";

type Row = Record<string, unknown>;

async function selectAll<T>(table: string): Promise<T[]> {
  const result = await getPool().query<Row>(`SELECT * FROM "${table}"`);
  return normalizeRows<T>(result.rows);
}

function mapDatabase(
  roles: Role[],
  users: User[],
  permissions: Permission[],
  menus: Menu[],
  routes: Route[],
  rolePermissions: RolePermission[],
  roleMenus: RoleMenu[],
  roleRoutes: RoleRoute[],
  angkatan: Angkatan[],
  kelas: Kelas[],
  siswa: Siswa[],
  mataPelajaran: MataPelajaran[],
  nilaiSiswa: NilaiSiswa[],
  kehadiranSiswa: KehadiranSiswa[],
  auditLog: AuditLog[]
): Database {
  return {
    roles,
    users,
    permissions,
    menus,
    routes,
    role_permissions: rolePermissions,
    role_menus: roleMenus,
    role_routes: roleRoutes,
    angkatan,
    kelas,
    siswa,
    mata_pelajaran: mataPelajaran,
    nilai_siswa: nilaiSiswa,
    kehadiran_siswa: kehadiranSiswa,
    audit_log: auditLog,
  };
}

export async function getDb(): Promise<Database> {
  const db = mapDatabase(
    await selectAll<Role>("Role"),
    await selectAll<User>("User"),
    await selectAll<Permission>("Permission"),
    await selectAll<Menu>("Menu"),
    await selectAll<Route>("Route"),
    await selectAll<RolePermission>("RolePermission"),
    await selectAll<RoleMenu>("RoleMenu"),
    await selectAll<RoleRoute>("RoleRoute"),
    await selectAll<Angkatan>("Angkatan"),
    await selectAll<Kelas>("Kelas"),
    await selectAll<Siswa>("Siswa"),
    await selectAll<MataPelajaran>("MataPelajaran"),
    await selectAll<NilaiSiswa>("NilaiSiswa"),
    await selectAll<KehadiranSiswa>("KehadiranSiswa"),
    await selectAll<AuditLog>("AuditLog")
  );

  if (db.roles.length === 0) {
    await writeDatabase(getPool(), buildPostgresSeed());
    return getDb();
  }

  return db;
}

export async function persist(data: Database): Promise<void> {
  await writeDatabase(getPool(), data);
}

export async function resetDb(): Promise<Database> {
  await writeDatabase(getPool(), buildPostgresSeed());
  return getDb();
}

export { newId, createIdAllocator, IdAllocator, generateId } from "./id";

