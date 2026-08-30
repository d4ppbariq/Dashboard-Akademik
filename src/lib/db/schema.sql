-- ============================================================================
-- Schema Database: Dashboard Akademik SMPN 1 Cibalong
-- Mesin: PostgreSQL
--
-- Format ini disesuaikan dengan cara sistem mengakses data saat ini
-- (data layer: src/lib/db/store.ts + action files di src/lib/*/actions.ts).
--
-- Keputusan desain penting agar aksi operator TETAP SINKRON:
--
-- 1) SEMUA primary key memakai TEXT karena sistem menghasilkan ID string via
--    newId() (contoh: "s-<time36>-<rand>") dan format terstruktur
--    (contoh: kelas.id = "<angkatan_id>-<A..F>", mapel.id = "mp-<kode>").
--
-- 2) SEMUA foreign key data akademik memakai ON DELETE CASCADE karena sistem
--    melakukan delete berjenjang secara MANUAL dalam satu persist():
--      - deleteSiswa   (src/lib/siswa/actions.ts)   -> siswa + nilai + kehadiran
--      - deleteMapel   (src/lib/master/actions.ts)  -> mapel + seluruh nilai
--      - deleteKelas   (src/lib/master/actions.ts)  -> kelas + siswa + nilai + kehadiran
--      - deleteAngkatan(src/lib/master/actions.ts)  -> angkatan -> kelas -> siswa -> turunan
--      - clearKelas    (src/lib/siswa/actions.ts)
--    Dengan CASCADE, PostgreSQL meniru perilaku tersebut sehingga tidak ada
--    aksi yang gagal karena restraint ataupun data menggantung (orphan).
--
-- 3) AuditLog.user_id sengaja TIDAK dijadikan foreign key mandatori, agar
--    riwayat log tidak ikut terhapus bila user dihapus/nonaktif.
--
-- 4) Constraint UNIQUE / CHECK merefleksikan validasi yang kini manual:
--      - user.email          unik  (kunci login)
--      - siswa.nis           unik
--      - mata_pelajaran.kode unik
--      - semester 1..6       (validasi zod)
--      - nilai 0..100        (validasi zod)
--      - tahun_lulus 2000-2100 (validasi zod)
--
-- Cara pakai (lihat struktur):
--   psql -U <user> -d <dbname> -f src/lib/db/schema.sql
--   lalu buka di DBeaver / pgAdmin.
-- ============================================================================

-- ============================ ENUM =========================================
CREATE TYPE jenis_kelamin AS ENUM ('L', 'P');
CREATE TYPE status_aktif AS ENUM ('AKTIF', 'NONAKTIF');
CREATE TYPE http_method AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');
CREATE TYPE audit_aksi AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'LOGIN', 'LOGOUT');

-- ============================ RBAC / AUTH =================================
CREATE TABLE "Role" (
  id         TEXT PRIMARY KEY,
  nama_role  TEXT NOT NULL,
  deskripsi  TEXT NOT NULL DEFAULT '',
  is_system  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "User" (
  id            TEXT PRIMARY KEY,
  nama          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id       TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
  status_aktif  status_aktif NOT NULL DEFAULT 'AKTIF'
);

CREATE TABLE "Permission" (
  id             TEXT PRIMARY KEY,
  kode_permission TEXT NOT NULL,
  deskripsi      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE "Menu" (
  id        TEXT PRIMARY KEY,
  nama_menu TEXT NOT NULL,
  path      TEXT NOT NULL,
  icon      TEXT NOT NULL DEFAULT '',
  urutan    INTEGER NOT NULL DEFAULT 0,
  grup      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE "Route" (
  id        TEXT PRIMARY KEY,
  path      TEXT NOT NULL,
  method    http_method NOT NULL,
  deskripsi TEXT NOT NULL DEFAULT ''
);

CREATE TABLE "RolePermission" (
  role_id       TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE "RoleMenu" (
  role_id TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
  menu_id TEXT NOT NULL REFERENCES "Menu"(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, menu_id)
);

CREATE TABLE "RoleRoute" (
  role_id  TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL REFERENCES "Route"(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, route_id)
);

-- ============================ AKADEMIK ====================================
CREATE TABLE "Angkatan" (
  id           TEXT PRIMARY KEY,
  tahun_lulus  INTEGER NOT NULL CHECK (tahun_lulus BETWEEN 2000 AND 2100)
);

CREATE TABLE "Kelas" (
  id          TEXT PRIMARY KEY,
  angkatan_id TEXT NOT NULL REFERENCES "Angkatan"(id) ON DELETE CASCADE,
  nama_kelas  TEXT NOT NULL
);

CREATE TABLE "Siswa" (
  id            TEXT PRIMARY KEY,
  kelas_id      TEXT NOT NULL REFERENCES "Kelas"(id) ON DELETE CASCADE,
  nis           TEXT NOT NULL UNIQUE,
  nama          TEXT NOT NULL,
  jenis_kelamin jenis_kelamin NOT NULL
);

CREATE TABLE "MataPelajaran" (
  id        TEXT PRIMARY KEY,
  nama_mapel TEXT NOT NULL,
  kode       TEXT NOT NULL UNIQUE,
  urutan     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "NilaiSiswa" (
  id                 TEXT PRIMARY KEY,
  siswa_id           TEXT NOT NULL REFERENCES "Siswa"(id) ON DELETE CASCADE,
  mata_pelajaran_id  TEXT NOT NULL REFERENCES "MataPelajaran"(id) ON DELETE CASCADE,
  semester           INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 6),
  nilai              INTEGER NOT NULL CHECK (nilai BETWEEN 0 AND 100)
);

CREATE TABLE "KehadiranSiswa" (
  id               TEXT PRIMARY KEY,
  siswa_id         TEXT NOT NULL REFERENCES "Siswa"(id) ON DELETE CASCADE,
  semester         INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 6),
  sakit            INTEGER NOT NULL DEFAULT 0 CHECK (sakit >= 0),
  izin             INTEGER NOT NULL DEFAULT 0 CHECK (izin >= 0),
  tanpa_keterangan INTEGER NOT NULL DEFAULT 0 CHECK (tanpa_keterangan >= 0)
);

-- ============================ SISTEM ======================================
CREATE TABLE "AuditLog" (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,          -- sengaja tanpa FK: riwayat log tetap aman bila user dihapus
  user_nama  TEXT NOT NULL DEFAULT '',
  aksi       audit_aksi NOT NULL,
  entitas    TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL DEFAULT '',
  waktu      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================ INDEX ========================================
-- Mempercepat pencarian berdasarkan relasi yang paling sering di-query
CREATE INDEX idx_user_role ON "User"(role_id);
CREATE INDEX idx_kelas_angkatan ON "Kelas"(angkatan_id);
CREATE INDEX idx_siswa_kelas ON "Siswa"(kelas_id);
CREATE INDEX idx_nilai_siswa ON "NilaiSiswa"(siswa_id);
CREATE INDEX idx_nilai_mapel ON "NilaiSiswa"(mata_pelajaran_id);
CREATE INDEX idx_kehadiran_siswa ON "KehadiranSiswa"(siswa_id);
CREATE INDEX idx_audit_waktu ON "AuditLog"(waktu);
