import { requireRoute, requireAuth } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AKSI_TONE: Record<string, string> = {
  LOGIN: "bg-blue-500/10 text-blue-600",
  LOGOUT: "bg-slate-500/10 text-slate-600",
  CREATE: "bg-emerald-500/10 text-emerald-600",
  UPDATE: "bg-amber-500/10 text-amber-600",
  DELETE: "bg-red-500/10 text-red-600",
  IMPORT: "bg-violet-500/10 text-violet-600",
};

function formatWaktu(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

export default async function AuditPage() {
  await requireRoute("/audit");
  const user = await requireAuth();

  const db = await getDb();
  const logs = [...db.audit_log]
    .sort((a, b) => b.waktu.localeCompare(a.waktu))
    .slice(0, 200);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Jejak aktivitas pengguna dalam sistem (200 entri terakhir)."
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Waktu</th>
                  <th className="p-3 font-medium">Pengguna</th>
                  <th className="p-3 font-medium">Aksi</th>
                  <th className="p-3 font-medium">Entitas</th>
                  <th className="p-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap p-3 tabular-nums text-muted-foreground">
                      {formatWaktu(log.waktu)}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{log.user_nama}</p>
                      <p className="text-xs text-muted-foreground">{log.user_id}</p>
                    </td>
                    <td className="p-3">
                      <Badge className={AKSI_TONE[log.aksi] ?? "bg-muted text-muted-foreground"}>
                        {log.aksi}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-xs">{log.entitas}</td>
                    <td className="p-3 text-muted-foreground">{log.detail}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                      Belum ada aktivitas tercatat. Pengguna yang sedang online: {user.nama}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
