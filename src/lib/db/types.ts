export type JenisKelamin = "L" | "P";

export type StatusAktif = "AKTIF" | "NONAKTIF";

export type RoleId = string;

export interface Role {
  id: string;
  nama_role: string;
  deskripsi: string;
  is_system: boolean;
}

export interface User {
  id: string;
  nama: string;
  email: string;
  password_hash: string;
  role_id: RoleId;
  status_aktif: StatusAktif;
}

export interface Permission {
  id: string;
  kode_permission: string;
  deskripsi: string;
}

export interface Menu {
  id: string;
  nama_menu: string;
  path: string;
  icon: string;
  urutan: number;
  grup: string;
}

export interface Route {
  id: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  deskripsi: string;
}

export interface RolePermission {
  role_id: RoleId;
  permission_id: string;
}

export interface RoleMenu {
  role_id: RoleId;
  menu_id: string;
}

export interface RoleRoute {
  role_id: RoleId;
  route_id: string;
}

export interface Angkatan {
  id: string;
  tahun_lulus: number;
}

export interface Kelas {
  id: string;
  angkatan_id: string;
  nama_kelas: string;
}

export interface Siswa {
  id: string;
  kelas_id: string;
  nis: string;
  nama: string;
  jenis_kelamin: JenisKelamin;
  status_aktif: StatusAktif;
}

export interface MataPelajaran {
  id: string;
  nama_mapel: string;
  kode: string;
  urutan: number;
}

export interface NilaiSiswa {
  id: string;
  siswa_id: string;
  mata_pelajaran_id: string;
  semester: number;
  nilai: number;
}

export interface KehadiranSiswa {
  id: string;
  siswa_id: string;
  semester: number;
  sakit: number;
  izin: number;
  tanpa_keterangan: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_nama: string;
  aksi: "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "LOGIN" | "LOGOUT";
  entitas: string;
  detail: string;
  waktu: string;
}

export interface Database {
  roles: Role[];
  users: User[];
  permissions: Permission[];
  menus: Menu[];
  routes: Route[];
  role_permissions: RolePermission[];
  role_menus: RoleMenu[];
  role_routes: RoleRoute[];
  angkatan: Angkatan[];
  kelas: Kelas[];
  siswa: Siswa[];
  mata_pelajaran: MataPelajaran[];
  nilai_siswa: NilaiSiswa[];
  kehadiran_siswa: KehadiranSiswa[];
  audit_log: AuditLog[];
}
