import "server-only";
import type { Database } from "@/lib/db/types";
import { newId } from "@/lib/db/store";

export interface AuditEntry {
  user_id: string;
  user_nama: string;
  aksi: string;
  entitas: string;
  detail: string;
}

export function pushAudit(
  db: Database,
  entry: Omit<Database["audit_log"][number], "id" | "waktu">
): void {
  db.audit_log.push({
    id: newId("log"),
    ...entry,
    waktu: new Date().toISOString(),
  });
}
