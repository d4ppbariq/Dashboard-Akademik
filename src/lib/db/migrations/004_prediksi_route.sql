-- ============================================================================
-- 004_prediksi_route.sql
--
-- Mendaftarkan halaman /prediksi pada tabel Route dan Menu, lalu memberi akses
-- ke role yang boleh melihatnya.
--
-- Latar belakang: hasRouteAccess fail-closed. Tanpa baris Route, halaman baru
-- akan selalu dialihkan ke /dashboard, termasuk untuk operator dan guru.
-- getDb() hanya melakukan seed saat tabel Role masih kosong, jadi instalasi
-- yang sudah terisi tidak pernah membaca ulang seed-postgres.ts.
--
-- File ini idempoten (aman dijalankan berulang) karena setiap INSERT dibungkus
-- pemeriksaan WHERE NOT EXISTS.
--
-- Dijalankan manual via DBeaver / psql (belum ada migration runner).
-- ============================================================================

-- ====================== RUTE ================================================

INSERT INTO "Route" (id, path, method, deskripsi)
SELECT 'route-24', '/prediksi', 'GET', 'Halaman prediksi nilai (rule engine B2)'
WHERE NOT EXISTS (
  SELECT 1 FROM "Route" WHERE path = '/prediksi' AND method = 'GET'
);

-- Superadmin tidak bergantung pada tabel ini (bypass eksplisit), tetapi grant
-- tetap dicatat agar konsisten dengan role lain.
INSERT INTO "RoleRoute" (role_id, route_id)
SELECT r.role_id, rt.id
FROM (VALUES ('role-superadmin'), ('role-operator'), ('role-guru')) AS r(role_id)
CROSS JOIN "Route" rt
WHERE rt.path = '/prediksi' AND rt.method = 'GET'
  AND NOT EXISTS (
    SELECT 1 FROM "RoleRoute" rr WHERE rr.role_id = r.role_id AND rr.route_id = rt.id
  );

-- ====================== MENU ================================================

INSERT INTO "Menu" (id, nama_menu, path, icon, urutan, grup)
SELECT 'menu-prediksi', 'Prediksi Nilai', '/prediksi', 'TrendingUp', 14, 'Analitik'
WHERE NOT EXISTS (
  SELECT 1 FROM "Menu" WHERE path = '/prediksi'
);

INSERT INTO "RoleMenu" (role_id, menu_id)
SELECT r.role_id, m.id
FROM (VALUES ('role-superadmin'), ('role-operator'), ('role-guru')) AS r(role_id)
CROSS JOIN "Menu" m
WHERE m.path = '/prediksi'
  AND NOT EXISTS (
    SELECT 1 FROM "RoleMenu" rm WHERE rm.role_id = r.role_id AND rm.menu_id = m.id
  );

-- ====================== PEMERIKSAAN ==========================================
-- Setiap query harus mengembalikan 1 baris (route) dan 3 baris (grant).
--
-- SELECT * FROM "Route" WHERE path = '/prediksi' AND method = 'GET';
-- SELECT * FROM "RoleRoute" WHERE route_id = 'route-24';
-- SELECT * FROM "Menu" WHERE path = '/prediksi';
-- SELECT * FROM "RoleMenu" WHERE menu_id = 'menu-prediksi';
-- ============================================================================

-- ====================== ROLLBACK =============================================
-- DELETE FROM "RoleMenu" WHERE menu_id = 'menu-prediksi';
-- DELETE FROM "Menu" WHERE path = '/prediksi';
-- DELETE FROM "RoleRoute" WHERE route_id = 'route-24';
-- DELETE FROM "Route" WHERE path = '/prediksi' AND method = 'GET';
-- ============================================================================
