import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserForm,
  UserActions,
} from "@/components/admin/user-actions";

export default async function AdminUsersPage() {
  await requireRoute("/admin/users");

  const db = await getDb();
  const roles = db.roles;

  return (
    <div>
      <PageHeader
        title="Manajemen User"
        description="Buat akun, atur status aktif, atau hapus pengguna sistem."
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <UserForm roles={roles} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Nama</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {db.users.map((u) => {
                  const role = roles.find((r) => r.id === u.role_id);
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3 font-medium">{u.nama}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">{role?.nama_role ?? "-"}</td>
                      <td className="p-3">
                        <Badge variant={u.status_aktif === "AKTIF" ? "default" : "outline"}>
                          {u.status_aktif}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <UserActions userId={u.id} status={u.status_aktif} />
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
