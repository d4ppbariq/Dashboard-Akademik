import type { Database, MataPelajaran } from "./types";

export const JUMLAH_SEMESTER = 6;

export const MATA_PELAJARAN_DEFAULT: MataPelajaran[] = [
  { id: "mp-1", kode: "PABP", nama_mapel: "Pendidikan Agama dan Budi Pekerti", urutan: 1 },
  { id: "mp-2", kode: "PPKn", nama_mapel: "Pendidikan Pancasila dan Kewarganegaraan", urutan: 2 },
  { id: "mp-3", kode: "BIN", nama_mapel: "Bahasa Indonesia", urutan: 3 },
  { id: "mp-4", kode: "MTK", nama_mapel: "Matematika", urutan: 4 },
  { id: "mp-5", kode: "IPA", nama_mapel: "Ilmu Pengetahuan Alam", urutan: 5 },
  { id: "mp-6", kode: "IPS", nama_mapel: "Ilmu Pengetahuan Sosial", urutan: 6 },
  { id: "mp-7", kode: "BIG", nama_mapel: "Bahasa Inggris", urutan: 7 },
  { id: "mp-8", kode: "MUS", nama_mapel: "Seni Musik", urutan: 8 },
  { id: "mp-9", kode: "PJK", nama_mapel: "PJOK", urutan: 9 },
  { id: "mp-10", kode: "INF", nama_mapel: "Informatika", urutan: 10 },
  { id: "mp-11", kode: "SUN", nama_mapel: "Bahasa Sunda", urutan: 11 },
  // Mapel kurikulum lama. Tetap berada di katalog global karena mapel di
  // sistem ini bukan milik angkatan tertentu; chart menyembunyikannya secara
  // otomatis bila angkatan terpilih tidak punya nilainya.
  { id: "mp-12", kode: "SBK", nama_mapel: "Seni dan Budaya", urutan: 12 },
  { id: "mp-13", kode: "PRK", nama_mapel: "Prakarya", urutan: 13 },
];

export const MAPEL_MEAN: Record<string, number> = {
  "mp-1": 83,
  "mp-2": 80,
  "mp-3": 78,
  "mp-4": 72,
  "mp-5": 74,
  "mp-6": 77,
  "mp-7": 75,
  "mp-8": 86,
  "mp-9": 88,
  "mp-10": 82,
  "mp-11": 84,
  "mp-12": 80,
  "mp-13": 77,
};

export const MAPEL_SPREAD: Record<string, number> = {
  "mp-1": 7,
  "mp-2": 8,
  "mp-3": 9,
  "mp-4": 12,
  "mp-5": 10,
  "mp-6": 9,
  "mp-7": 10,
  "mp-8": 8,
  "mp-9": 7,
  "mp-10": 9,
  "mp-11": 8,
  "mp-12": 7,
  "mp-13": 6,
};

const NAMA_DEPAN_L = [
  "Asep", "Budi", "Cecep", "Dedi", "Deden", "Eko", "Fajar", "Gilang", "Hendi",
  "Ilham", "Jaka", "Kusnadi", "Lukman", "Maman", "Nana", "Oman", "Rahmat",
  "Rizal", "Tatang", "Ujang", "Wawan", "Yudi", "Agus", "Ridwan", "Soleh",
];

const NAMA_DEPAN_P = [
  "Ade", "Citra", "Dewi", "Eneng", "Fitri", "Indah", "Ika", "Lilis", "Nenden",
  "Popon", "Rina", "Sari", "Siti", "Teti", "Titin", "Yanti", "Nurul", "Nia",
  "Salsa", "Putri", "Winda", "Yuli", "Maya", "Ratna", "Intan",
];

const NAMA_BELAKANG = [
  "Supriatna", "Nugraha", "Setiawan", "Herlina", "Firmansyah", "Ramdani",
  "Kusumah", "Wijaya", "Hidayat", "Pratama", "Suryana", "Maulana", "Gunawan",
  "Sudirman", "Permana", "Rahayu", "Mulyani", "Fauziah", "Komalasari",
  "Lesmana", "Saputra", "Wulandari", "Anggraeni", "Hartanto", "Ningsih",
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function buildSeed(): Database {
  const rng = mulberry32(20260816);

  const roles = [
    { id: "role-superadmin", nama_role: "Superadmin", deskripsi: "Akses penuh konfigurasi sistem dan seluruh modul", is_system: true },
    { id: "role-operator", nama_role: "Operator", deskripsi: "Mengelola data akademik, kehadiran, dan master data", is_system: true },
    { id: "role-guru", nama_role: "Guru", deskripsi: "Read-only: memantau performa akademik dan kehadiran", is_system: true },
  ];

  const users = [
    {
      id: "u-1",
      nama: "Superadmin Nesaciba",
      email: "superadmin@nesaciba.sch.id",
      password_hash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", // sha256("admin123")
      role_id: "role-superadmin",
      status_aktif: "AKTIF" as const,
    },
    {
      id: "u-2",
      nama: "Operator Akademik",
      email: "operator@nesaciba.sch.id",
      password_hash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // sha256("admin")
      role_id: "role-operator",
      status_aktif: "AKTIF" as const,
    },
    {
      id: "u-3",
      nama: "Guru (Akun Umum)",
      email: "guru@nesaciba.sch.id",
      password_hash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // sha256("admin")
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

  const angkatan = [
    { id: "angkatan-2025", tahun_lulus: 2025 },
    { id: "angkatan-2026", tahun_lulus: 2026 },
  ];

  const kelas: Database["kelas"] = [];
  const siswa: Database["siswa"] = [];
  const nilai_siswa: Database["nilai_siswa"] = [];
  const kehadiran_siswa: Database["kehadiran_siswa"] = [];

  const JUMLAH_PER_KELAS = [29, 30, 28, 31, 29, 30];
  const HURUF_KELAS = ["A", "B", "C", "D", "E", "F"];

  let studentSeq = 0;
  let nilaiSeq = 0;
  let kehadiranSeq = 0;

  angkatan.forEach((a) => {
    const tahun = String(a.tahun_lulus).slice(2);
    HURUF_KELAS.forEach((huruf, ki) => {
      const kelasId = `kelas-${a.id}-${huruf}`;
      kelas.push({ id: kelasId, angkatan_id: a.id, nama_kelas: `${huruf}` });

      const jumlah = JUMLAH_PER_KELAS[ki];
      for (let i = 0; i < jumlah; i++) {
        studentSeq += 1;
        const siswaId = `s-${String(studentSeq).padStart(4, "0")}`;
        const isL = rng() > 0.48;
        const namaDepan = pick(rng, isL ? NAMA_DEPAN_L : NAMA_DEPAN_P);
        const namaBelakang = pick(rng, NAMA_BELAKANG);
        const nis = `${tahun}${String(ki + 1)}${String(i + 1).padStart(4, "0")}`;
        const genderRng = mulberry32(studentSeq * 7 + 13);
        siswa.push({
          id: siswaId,
          kelas_id: kelasId,
          nis,
          nama: `${namaDepan} ${namaBelakang}`,
          jenis_kelamin: isL ? "L" : "P",
        });

        const ability = 0.45 + genderRng() * 0.55;
        const rajin = genderRng();

        for (let smt = 1; smt <= JUMLAH_SEMESTER; smt++) {
          kehadiranSeq += 1;
          kehadiran_siswa.push({
            id: `k-${String(kehadiranSeq).padStart(5, "0")}`,
            siswa_id: siswaId,
            semester: smt,
            sakit: randInt(genderRng, 0, Math.round(3 + rajin * 3)),
            izin: randInt(genderRng, 0, Math.round(2 + rajin * 2)),
            tanpa_keterangan: rajin > 0.78 ? randInt(genderRng, 2, 9) : randInt(genderRng, 0, 3),
          });

          MATA_PELAJARAN_DEFAULT.forEach((mp) => {
            nilaiSeq += 1;
            const mean = MAPEL_MEAN[mp.id];
            const spread = MAPEL_SPREAD[mp.id];
            const trend = (smt - 1) * 0.6;
            let nilai = mean + (genderRng() - 0.5) * 2 * spread + trend + (ability - 0.5) * 10;
            nilai = Math.round(Math.max(45, Math.min(99, nilai)));
            nilai_siswa.push({
              id: `n-${String(nilaiSeq).padStart(6, "0")}`,
              siswa_id: siswaId,
              mata_pelajaran_id: mp.id,
              semester: smt,
              nilai,
            });
          });
        }
      }
    });
  });

  return {
    roles,
    users,
    permissions,
    menus,
    routes,
    role_permissions,
    role_menus,
    role_routes,
    angkatan,
    kelas,
    siswa,
    mata_pelajaran: MATA_PELAJARAN_DEFAULT,
    nilai_siswa,
    kehadiran_siswa,
    audit_log: [],
  };
}
