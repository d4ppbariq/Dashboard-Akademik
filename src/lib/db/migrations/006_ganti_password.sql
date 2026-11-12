-- Additive, idempotent registration; does not touch accounts or academic data.
-- Apply manually on existing installations. Do not use db:seed/db:reset.
BEGIN;

INSERT INTO "Route" (id, path, method, deskripsi)
SELECT 'route-ganti-password', '/ganti-password', 'GET', 'Ganti password akun superadmin sendiri'
WHERE NOT EXISTS (SELECT 1 FROM "Route" WHERE path = '/ganti-password' AND method = 'GET');

INSERT INTO "RoleRoute" (role_id, route_id)
SELECT r.id, rt.id FROM "Role" r CROSS JOIN "Route" rt
WHERE r.id = 'role-superadmin' AND rt.path = '/ganti-password' AND rt.method = 'GET'
AND NOT EXISTS (SELECT 1 FROM "RoleRoute" rr WHERE rr.role_id = r.id AND rr.route_id = rt.id);

INSERT INTO "Menu" (id, nama_menu, path, icon, urutan, grup)
SELECT 'menu-ganti-password', 'Ganti Password', '/ganti-password', 'KeyRound', 15, 'Akun'
WHERE NOT EXISTS (SELECT 1 FROM "Menu" WHERE path = '/ganti-password');

INSERT INTO "RoleMenu" (role_id, menu_id)
SELECT r.id, m.id FROM "Role" r CROSS JOIN "Menu" m
WHERE r.id = 'role-superadmin' AND m.path = '/ganti-password'
AND NOT EXISTS (SELECT 1 FROM "RoleMenu" rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);

COMMIT;

-- Verify: one GET route, one menu; each granted only to role-superadmin.
-- SELECT rt.path, rt.method, rr.role_id FROM "Route" rt JOIN "RoleRoute" rr ON rr.route_id = rt.id WHERE rt.path = '/ganti-password';
-- SELECT m.path, rm.role_id FROM "Menu" m JOIN "RoleMenu" rm ON rm.menu_id = m.id WHERE m.path = '/ganti-password';
