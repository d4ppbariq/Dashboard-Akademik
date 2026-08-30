import type { Pool, QueryResult } from "pg";
import type { Database } from "./types";

type Row = Record<string, unknown>;

export const DB_TABLES = [
  "Role",
  "User",
  "Permission",
  "Menu",
  "Route",
  "RolePermission",
  "RoleMenu",
  "RoleRoute",
  "Angkatan",
  "Kelas",
  "Siswa",
  "MataPelajaran",
  "NilaiSiswa",
  "KehadiranSiswa",
  "AuditLog",
] as const;

export interface TableData {
  name: string;
  columns: string[];
  rows: Row[];
}

export function collectTables(seed: Database): TableData[] {
  return [
    { name: "Role", columns: ["id", "nama_role", "deskripsi", "is_system"], rows: seed.roles as unknown as Row[] },
    { name: "Permission", columns: ["id", "kode_permission", "deskripsi"], rows: seed.permissions as unknown as Row[] },
    { name: "Menu", columns: ["id", "nama_menu", "path", "icon", "urutan", "grup"], rows: seed.menus as unknown as Row[] },
    { name: "Route", columns: ["id", "path", "method", "deskripsi"], rows: seed.routes as unknown as Row[] },
    { name: "Angkatan", columns: ["id", "tahun_lulus"], rows: seed.angkatan as unknown as Row[] },
    { name: "MataPelajaran", columns: ["id", "nama_mapel", "kode", "urutan"], rows: seed.mata_pelajaran as unknown as Row[] },
    { name: "User", columns: ["id", "nama", "email", "password_hash", "role_id", "status_aktif"], rows: seed.users as unknown as Row[] },
    { name: "RolePermission", columns: ["role_id", "permission_id"], rows: seed.role_permissions as unknown as Row[] },
    { name: "RoleMenu", columns: ["role_id", "menu_id"], rows: seed.role_menus as unknown as Row[] },
    { name: "RoleRoute", columns: ["role_id", "route_id"], rows: seed.role_routes as unknown as Row[] },
    { name: "Kelas", columns: ["id", "angkatan_id", "nama_kelas"], rows: seed.kelas as unknown as Row[] },
    { name: "Siswa", columns: ["id", "kelas_id", "nis", "nama", "jenis_kelamin"], rows: seed.siswa as unknown as Row[] },
    { name: "NilaiSiswa", columns: ["id", "siswa_id", "mata_pelajaran_id", "semester", "nilai"], rows: seed.nilai_siswa as unknown as Row[] },
    { name: "KehadiranSiswa", columns: ["id", "siswa_id", "semester", "sakit", "izin", "tanpa_keterangan"], rows: seed.kehadiran_siswa as unknown as Row[] },
    { name: "AuditLog", columns: ["id", "user_id", "user_nama", "aksi", "entitas", "detail", "waktu"], rows: seed.audit_log as unknown as Row[] },
  ];
}

/**
 * Menulis seluruh isi Database ke PostgreSQL dalam satu transaksi:
 * TRUNCATE semua tabel, lalu insert ulang (parent -> child).
 */
export async function writeDatabase(pool: Pool, seed: Database): Promise<void> {
  const tables = collectTables(seed);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE ${DB_TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);

    for (const table of tables) {
      if (table.rows.length === 0) continue;
      await insertRows(client.query.bind(client), table);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function insertRows(
  query: (text: string, values?: unknown[]) => Promise<QueryResult>,
  table: TableData
): Promise<void> {
  const columns = table.columns.join(", ");
  const values: unknown[] = [];
  const valueGroups: string[] = [];

  let paramIndex = 1;
  for (const row of table.rows) {
    const group: string[] = [];
    for (const col of table.columns) {
      group.push(`$${paramIndex}`);
      values.push(row[col]);
      paramIndex += 1;
    }
    valueGroups.push(`(${group.join(", ")})`);
  }

  await query(
    `INSERT INTO "${table.name}" (${columns}) VALUES ${valueGroups.join(", ")}`,
    values
  );
}
