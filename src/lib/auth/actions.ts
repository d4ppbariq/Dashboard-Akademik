"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, persist } from "@/lib/db/store";
import { createSession, deleteSession, readSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

const LoginSchema = z.object({
  email: z.email({ message: "Format email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

export type LoginState =
  | { error?: string; fieldErrors?: { email?: string[]; password?: string[] } }
  | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    };
  }

  const { email, password } = parsed.data;
  const db = await getDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user || user.password_hash !== hashPassword(password)) {
    return { error: "Email atau password salah" };
  }
  if (user.status_aktif === "NONAKTIF") {
    return { error: "Akun ini telah dinonaktifkan. Hubungi superadmin." };
  }

  const role = db.roles.find((r) => r.id === user.role_id);
  await createSession({
    userId: user.id,
    nama: user.nama,
    roleId: user.role_id,
    roleName: role?.nama_role ?? "Unknown",
  });

  db.audit_log.push({
    id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: user.id,
    user_nama: user.nama,
    aksi: "LOGIN",
    entitas: "user",
    detail: `${user.nama} masuk ke sistem`,
    waktu: new Date().toISOString(),
  });
  await persist(db);

  redirect("/dashboard");
}

export async function logout() {
  const session = await readSession();
  if (session) {
    const db = await getDb();
    db.audit_log.push({
      id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: session.userId,
      user_nama: session.nama,
      aksi: "LOGOUT",
      entitas: "user",
      detail: `${session.nama} keluar dari sistem`,
      waktu: new Date().toISOString(),
    });
    await persist(db);
  }
  await deleteSession();
  redirect("/login");
}
