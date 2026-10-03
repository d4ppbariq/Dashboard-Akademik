import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  parseSessionPayload,
  resolveCookieSecure,
  resolveSessionSecret,
  SESSION_COOKIE,
  SESSION_TTL_JWT,
  SESSION_TTL_MS,
  type SessionPayload,
} from "./token";

/**
 * Kunci dan atribut cookie dibaca saat pertama kali dipakai, bukan saat modul
 * diimpor. Alasannya: halaman /login mengimpor modul ini transitif, sehingga
 * validasi di level modul akan menggagalkan `next build` pada mesin yang .env
 *-nya belum diisi. Dengan begitu aplikasi tetap gagal menyala sebelum
 * melayani satu pun request, tapi proses build tidak ikut gagal.
 */
let encodedKey: Uint8Array | undefined;
let cookieSecure: boolean | undefined;

function getEncodedKey(): Uint8Array {
  if (!encodedKey) {
    encodedKey = new TextEncoder().encode(
      resolveSessionSecret(process.env.SESSION_SECRET)
    );
  }
  return encodedKey;
}

function isCookieSecure(): boolean {
  if (cookieSecure === undefined) {
    cookieSecure = resolveCookieSecure(process.env.COOKIE_SECURE);
  }
  return cookieSecure;
}

export async function sign(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL_JWT)
    .sign(getEncodedKey());
}

export async function verifySession(
  session: string | undefined
): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    return parseSessionPayload(payload);
  } catch {
    // Token kedaluwarsa, tanda tangan palsu, dan kunci yang salah sengaja
    // disamakan menjadi null. Isi token tidak boleh masuk log apa pun.
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const session = await sign(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySession(value);
}