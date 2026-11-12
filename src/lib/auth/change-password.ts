import "server-only";
import type { Database } from "@/lib/db/types";
import { pushAudit } from "@/lib/audit";
import { hashPassword } from "./password";
import { SUPERADMIN_ROLE_ID } from "./route-access";
import { passwordSchema, konfirmasiCocok, KONFIRMASI_GAGAL } from "./password-policy";

export type ChangePasswordResult = { error?: string; success?: boolean };

export function canChangeOwnPassword(db: Database, userId: string): boolean {
  const user = db.users.find((u) => u.id === userId);
  return user?.status_aktif === "AKTIF" &&
    user.role_id === SUPERADMIN_ROLE_ID &&
    db.roles.some((r) => r.id === SUPERADMIN_ROLE_ID);
}

/** Injectable persistence keeps tests isolated from real accounts. */
export async function changeOwnPassword(
  db: Database,
  authenticatedUserId: string,
  form: FormData,
  save: (db: Database) => Promise<void>,
): Promise<ChangePasswordResult> {
  if (!canChangeOwnPassword(db, authenticatedUserId)) {
    return { error: "Hanya superadmin aktif yang dapat mengganti password sendiri" };
  }
  const user = db.users.find((u) => u.id === authenticatedUserId)!;
  const current = form.get("current_password");
  if (typeof current !== "string" || !current || hashPassword(current) !== user.password_hash) {
    return { error: "Password saat ini tidak cocok" };
  }
  const parsed = passwordSchema.safeParse(form.get("password"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Password baru tidak valid" };
  }
  if (!konfirmasiCocok(parsed.data, form.get("password_confirm"))) {
    return { error: KONFIRMASI_GAGAL };
  }
  const nextHash = hashPassword(parsed.data);
  if (nextHash === user.password_hash) {
    return { error: "Password baru harus berbeda dari password saat ini" };
  }
  user.password_hash = nextHash;
  pushAudit(db, {
    user_id: user.id,
    user_nama: user.nama,
    aksi: "UPDATE",
    entitas: "user",
    detail: "Mengganti password akun sendiri",
  });
  await save(db);
  return { success: true };
}
