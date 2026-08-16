import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MenuForm,
  EntityDeleteButton,
  deleteMenu,
} from "@/components/admin/admin-forms";

export default async function AdminMenusPage() {
  await requireRoute("/admin/menus");

  const db = await getDb();
  const sorted = [...db.menus].sort((a, b) => a.urutan - b.urutan);

  return (
    <div>
      <PageHeader
        title="Manajemen Menu"
        description="Daftar menu navigasi sidebar beserta urutan dan grupnya."
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <MenuForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Urutan</th>
                  <th className="p-3 font-medium">Nama</th>
                  <th className="p-3 font-medium">Path</th>
                  <th className="p-3 font-medium">Ikon</th>
                  <th className="p-3 font-medium">Grup</th>
                  <th className="p-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 tabular-nums text-muted-foreground">{m.urutan}</td>
                    <td className="p-3 font-medium">{m.nama_menu}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{m.path}</td>
                    <td className="p-3 font-mono text-xs">{m.icon}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{m.grup}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <EntityDeleteButton
                        id={m.id}
                        action={deleteMenu}
                        label={`menu ${m.nama_menu}`}
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
