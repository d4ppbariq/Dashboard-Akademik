import { z } from "zod";

/**
 * Bagian session yang murni: nama cookie, masa berlaku, bentuk payload, dan
 * pembacaan variabel lingkungan. Sengaja TANPA "server-only" dan tanpa
 * next/headers supaya bisa diuji tanpa database (lihat token.test.ts).
 *
 * Fungsi yang menyentuh cookies() tetap di session.ts.
 */

export const SESSION_COOKIE = "session";

/**
 * Keputusan produk, bukan sekadar angka: sesi berlaku 7 hari. Nilai ini
 * dibaca dua kali oleh session.ts, untuk setExpirationTime dan untuk maxAge,
 * sehingga keduanya tidak mungkin berbeda.
 */
export const SESSION_TTL_HARI = 7;
export const SESSION_TTL_MS = SESSION_TTL_HARI * 24 * 60 * 60 * 1000;
export const SESSION_TTL_JWT = `${SESSION_TTL_HARI}d`;

export const SESSION_SECRET_MIN = 32;

export const SessionPayloadSchema = z.object({
  userId: z.string().min(1),
  nama: z.string(),
  roleId: z.string(),
  roleName: z.string(),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

/**
 * jwtVerify sudah memverifikasi tanda tangan dan kedaluwarsa. Yang belum
 * ada adalah bentuk payload: token buatan bisa lolos pemeriksaan tanda tangan
 * lalu berisi field yang tidak lengkap. safeParse mengembalikan null untuk
 * kasus itu, sama seperti token yang gagal diverifikasi.
 */
export function parseSessionPayload(payload: unknown): SessionPayload | null {
  const parsed = SessionPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/**
 * SESSION_SECRET tidak boleh punya nilai cadangan di dalam kode. Dengan
 * fallback, instalasi yang lupa mengisi .env akan berjalan memakai kunci yang
 * tertulis di repositori dan bisa ditiru siapa pun. Melempar error lebih aman
 * daripada berjalan dengan kunci yang sudah diketahui.
 */
export function resolveSessionSecret(raw: string | undefined): string {
  const secret = raw?.trim();
  if (!secret) {
    throw new Error(
      "SESSION_SECRET tidak terkonfigurasi. Lihat .env.example. " +
        "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (secret.length < SESSION_SECRET_MIN) {
    throw new Error(
      `SESSION_SECRET terlalu pendek (${secret.length} karakter). ` +
        `Minimal ${SESSION_SECRET_MIN} karakter.`
    );
  }
  return secret;
}

/**
 * COOKIE_SECURE harus ditulis eksplisit. Versi lama memakai `=== "true"`,
 * sehingga variabel yang lupa diisi berakhir menjadi false dan cookie dikirim
 * tanpa TLS tanpa ada yang menyadari. Mode ini membalik arah default: nilai
 * yang tidak dikenali adalah kesalahan, bukan "aman".
 *
 * Catatan: atribut secure hanya bisa true di atas HTTPS. Bila aplikasi
 * dijalankan di LAN tanpa TLS, .env harus berisi COOKIE_SECURE=false secara
 * sadar, bukan mengandalkan nilai kosong.
 */
export function resolveCookieSecure(raw: string | undefined): boolean {
  const value = raw?.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(
    'COOKIE_SECURE harus diisi "true" atau "false". ' +
      "Gunakan false hanya bila aplikasi diakses via HTTP (LAN tanpa TLS). " +
      "Lihat .env.example."
  );
}