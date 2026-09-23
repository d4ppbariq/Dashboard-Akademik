import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditDescriptionDialog } from "@/components/admin/edit-description-dialog";
import { updatePermissionDescription } from "@/lib/admin/actions";

export default async function AdminPermissionsPage() {
  await requireRoute("/admin/permissions");

  const db = await getDb();

  return (
    <div>
      <PageHeader
        title="Manajemen Permission"
        description="Daftar izin operasional yang dapat ditautkan ke role."
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Kode</th>
                  <th className="p-3 font-medium">Deskripsi</th>
                  <th className="p-3 font-medium">Digunakan Role</th>
                  <th className="p-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {db.permissions.map((p) => {
                  const count = db.role_permissions.filter(
                    (rp) => rp.permission_id === p.id
                  ).length;
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono">
                          {p.kode_permission}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{p.deskripsi}</td>
                      <td className="p-3">{count} role</td>
                      <td className="p-3 text-right">
                        <EditDescriptionDialog
                          id={p.id}
                          title={`Edit deskripsi ${p.kode_permission}`}
                          fieldLabel="Deskripsi permission"
                          currentValue={p.deskripsi}
                          action={updatePermissionDescription}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
