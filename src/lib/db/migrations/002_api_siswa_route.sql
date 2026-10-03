-- ============================================================================
-- 002_api_siswa_route.sql
--
-- Mendaftarkan endpoint GET /api/siswa/[id] pada tabel Route dan memberi grant
-- ke role yang memang boleh membacanya.
--
-- Latar belakang: hasRouteAccess kini fail-closed, yaitu path yang tidak
-- terdaftar berarti DITOLAK (sebelumnya otomatis DIBOLEHKAN untuk semua role).
-- Endpoint ini sebelumnya tidak terdaftar, jadi masih bisa dipanggil oleh siapa
-- pun yang sudah login. Sekarang endpoint itu memakai permission siswa.read.
--
-- File ini idempoten (aman dijalankan berulang) karena setiap INSERT dibungkus
-- pemeriksaan WHERE NOT EXISTS.
--
-- PENTING: perubahan pada src/lib/db/seed-postgres.ts TIDAK otomatis masuk ke
-- database yang sudah terisi, karena getDb() hanya melakukan seed bila tabel
-- Role masih kosong. Instalasi lama butuh migrasi ini.
--
-- Dijalankan manual via DBeaver / psql (belum ada migration runner).
-- ============================================================================

-- ====================== RUTE ================================================

INSERT INTO "Route" (id, path, method, deskripsi)
SELECT 'route-23', '/api/siswa/[id]', 'GET', 'Detail nilai dan kehadiran satu siswa'
WHERE NOT EXISTS (
  SELECT 1 FROM "Route" WHERE path = '/api/siswa/[id]' AND method = 'GET'
);

-- ====================== GRANT ================================================
-- Guru tetap mendapat akses karena endpoint ini read-only, sama seperti
-- permission siswa.read yang memang dimiliki role-guru. Role lain tidak
-- ditambah; superadmin tidak bergantung pada tabel ini karena hasRouteAccess
-- memberi bypass eksplisit untuk role-superadmin.

INSERT INTO "RoleRoute" (role_id, route_id)
SELECT r.role_id, rt.id
FROM (VALUES ('role-operator'), ('role-guru')) AS r(role_id)
CROSS JOIN "Route" rt
WHERE rt.path = '/api/siswa/[id]' AND rt.method = 'GET'
  AND NOT EXISTS (
    SELECT 1 FROM "RoleRoute" rr WHERE rr.role_id = r.role_id AND rr.route_id = rt.id
  );

-- ====================== PEMERIKSAAN ==========================================
-- Setiap query di bawah harus mengembalikan 1 baris (route) dan 2 baris (grant).
--
-- SELECT * FROM "Route" WHERE path = '/api/siswa/[id]';
--
-- SELECT * FROM "RoleRoute" WHERE route_id = 'route-23';
-- ============================================================================

-- ====================== ROLLBACK =============================================
-- Untuk membatalkan, hapus grant lalu routenya:
--
-- DELETE FROM "RoleRoute" WHERE route_id IN (
--   SELECT id FROM "Route" WHERE path = '/api/siswa/[id]' AND method = 'GET'
-- );
-- DELETE FROM "Route" WHERE path = '/api/siswa/[id]' AND method = 'GET';
--
-- Menghapus baris Route mengembalikan endpoint ke fail-closed (403), bukan ke
-- fail-open. Jangan lakukan tanpa alasan.