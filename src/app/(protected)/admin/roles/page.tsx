import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleDetailDialog } from "@/components/admin/role-detail-dialog";

export default async function AdminRolesPage() {
  await requireRoute("/admin/roles");

  const db = await getDb();

  return (
    <div>
      <PageHeader
        title="Manajemen Role"
        description="Atur permission, menu, dan akses rute untuk setiap role."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {db.roles.map((role) => {
          const perms = db.role_permissions.filter((rp) => rp.role_id === role.id);
          const menus = db.role_menus.filter((rm) => rm.role_id === role.id);
          const routes = db.role_routes.filter((rr) => rr.role_id === role.id);
          const userCount = db.users.filter((u) => u.role_id === role.id).length;

          return (
            <Card key={role.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{role.nama_role}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.deskripsi ?? "-"}
                    </p>
                  </div>
                  <RoleDetailDialog
                    roleId={role.id}
                    roleName={role.nama_role}
                    permissions={db.permissions.map((p) => ({
                      id: p.id,
                      kode_permission: p.kode_permission,
                      deskripsi: p.deskripsi,
                      assigned: perms.some((rp) => rp.permission_id === p.id),
                    }))}
                    menus={db.menus.map((m) => ({
                      id: m.id,
                      nama_menu: m.nama_menu,
                      path: m.path,
                      assigned: menus.some((rm) => rm.menu_id === m.id),
                    }))}
                    routes={db.routes.map((r) => ({
                      id: r.id,
                      path: r.path,
                      method: r.method,
                      deskripsi: r.deskripsi,
                      assigned: routes.some((rr) => rr.route_id === r.id),
                    }))}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{perms.length} permission</Badge>
                  <Badge variant="secondary">{menus.length} menu</Badge>
                  <Badge variant="secondary">{routes.length} rute</Badge>
                  <Badge variant="outline">{userCount} user</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
