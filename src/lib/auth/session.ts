import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET =
  process.env.SESSION_SECRET ?? "nesaciba-dev-secret-change-in-production";
const encodedKey = new TextEncoder().encode(SECRET);

export interface SessionPayload {
  userId: string;
  nama: string;
  roleId: string;
  roleName: string;
  expiresAt: string;
}

export async function encrypt(payload: Omit<SessionPayload, "expiresAt">) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(
  session: string | undefined
): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, "expiresAt">) {
  const session = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get("session")?.value;
  return decrypt(value);
}
