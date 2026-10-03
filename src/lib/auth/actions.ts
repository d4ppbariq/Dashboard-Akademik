"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, getUserByEmail, persist } from "@/lib/db/store";
import { createSession, deleteSession, readSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createLoginThrottle } from "@/lib/auth/login-throttle";
import type { AuditLog } from "@/lib/db/types";

const LOGIN_MAX_PERCOBAAN_PER_AKUN = 5;
const LOGIN_MAX_PERCOBAAN_PER_IP = 20;
const LOGIN_JENDELA_MS = 15 * 60 * 1000;

const throttle = createLoginThrottle({
  maxPercobaanPerAkun: LOGIN_MAX_PERCOBAAN_PER_AKUN,
  maxPercobaanPerIp: LOGIN_MAX_PERCOBAAN_PER_IP,
  windowMs: LOGIN_JENDELA_MS,
});

const LoginSchema = z.object({
  email: z.email({ message: "Format email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

export type LoginState =
  | { error?: string; fieldErrors?: { email?: string[]; password?: string[] } }
  | undefined;

/**
 * Address untuk penghitung per IP. Tanpa reverse proxy, nilai ini bisa
 * dipalsukan; karena itu penghitung per akun tetap menjadi batas utama.
 */
async function alamatIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || h.get("x-real-ip")?.trim() || "unknown";
}

function pushAudit(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  userNama: string,
  aksi: AuditLog["aksi"],
  detail: string
) {
  db.audit_log.push({
    id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    user_nama: userNama,
    aksi,
    entitas: "user",
    detail,
    waktu: new Date().toISOString(),
  });
}

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
  const ip = await alamatIp();

  const verdict = throttle.periksa(email, ip);
  if (!verdict.allowed) {
    return {
      error:
        `Terlalu banyak percobaan. Coba lagi dalam ${verdict.tungguDetik} detik.`,
    };
  }

  // Satu baris User, bukan 15 tabel. getDb() penuh dipanggil setelah password
  // cocok, karena nama role dan audit log membutuhkannya.
  const user = await getUserByEmail(email);

  if (!user || user.password_hash !== hashPassword(password)) {
    throttle.catatGagal(email, ip);
    // Pesan tetap sama dengan "kredensial salah" supaya tidak membocorkan
    // apakah email itu terdaftar. Isi token tidak pernah ikut dicatat.
    console.warn(`Login gagal untuk ${email} dari ${ip}.`);
    return { error: "Email atau password salah" };
  }
  if (user.status_aktif === "NONAKTIF") {
    return { error: "Akun ini telah dinonaktifkan. Hubungi superadmin." };
  }

  const db = await getDb();
  const role = db.roles.find((r) => r.id === user.role_id);
  throttle.reset(email, ip);

  await createSession({
    userId: user.id,
    nama: user.nama,
    roleId: user.role_id,
    roleName: role?.nama_role ?? "Unknown",
  });

  pushAudit(
    db,
    user.id,
    user.nama,
    "LOGIN",
    `${user.nama} masuk ke sistem`
  );
  await persist(db);

  redirect("/dashboard");
}

export async function logout() {
  const session = await readSession();
  if (session) {
    const db = await getDb();
    pushAudit(
      db,
      session.userId,
      session.nama,
      "LOGOUT",
      `${session.nama} keluar dari sistem`
    );
    await persist(db);
  }
  await deleteSession();
  redirect("/login");
}
