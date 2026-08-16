import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RouteForm,
  EntityDeleteButton,
  deleteRoute,
} from "@/components/admin/admin-forms";

export default async function AdminRoutesPage() {
  await requireRoute("/admin/routes");

  const db = await getDb();
  const sorted = [...db.routes].sort((a, b) =>
    a.path.localeCompare(b.path) || a.method.localeCompare(b.method)
  );

  return (
    <div>
      <PageHeader
        title="Manajemen Rute"
        description="Daftar rute yang dapat diakses oleh role."
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <RouteForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Deskripsi</th>
                  <th className="p-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.method}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-xs font-semibold">{r.path}</td>
                    <td className="p-3 text-muted-foreground">{r.deskripsi}</td>
                    <td className="p-3 text-right">
                      <EntityDeleteButton
                        id={r.id}
                        action={deleteRoute}
                        label={`rute ${r.method} ${r.path}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
