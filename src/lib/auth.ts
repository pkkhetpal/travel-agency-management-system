import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters.");
}
export const COOKIE_NAME = "traveldesk_session";
export type SessionUser = { userId: string; companyId: string; name: string; email: string; role: string };
export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
  cookies().set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.userId || !payload.companyId) return null;
    const user = await prisma.user.findFirst({ where: { id: String(payload.userId), companyId: String(payload.companyId), isActive: true }, select: { id: true, companyId: true, name: true, email: true, role: true } });
    if (!user) return null;
    return { userId: user.id, companyId: user.companyId, name: user.name, email: user.email, role: user.role };
  } catch { return null; }
}
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}
