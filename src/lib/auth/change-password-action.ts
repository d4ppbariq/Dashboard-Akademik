"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "./dal";
import { getDb, persist } from "@/lib/db/store";
import { changeOwnPassword, type ChangePasswordResult } from "./change-password";

export async function changePassword(form: FormData): Promise<ChangePasswordResult> {
  // Authenticate every invocation; never accept a target user ID from the client.
  const user = await requireAuth();
  const db = await getDb();
  // The service rechecks the active account and canonical superadmin role in DB.
  const result = await changeOwnPassword(db, user.id, form, persist);
  if (result.success) revalidatePath("/ganti-password");
  // Existing signed sessions remain valid; no per-user revocation is available.
  return result;
}
