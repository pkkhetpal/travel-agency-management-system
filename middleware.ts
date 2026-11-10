import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "missing-secret-that-will-not-validate-any-token");
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/login") || path.startsWith("/setup") || path.startsWith("/api/auth") || path.startsWith("/_next") || path === "/favicon.ico") return NextResponse.next();
  const token = request.cookies.get("traveldesk_session")?.value;
  if (!token) return path.startsWith("/api/") ? NextResponse.json({ error: "Please sign in." }, { status: 401 }) : NextResponse.redirect(new URL("/login", request.url));
  try { await jwtVerify(token, secret()); return NextResponse.next(); }
  catch { return path.startsWith("/api/") ? NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 }) : NextResponse.redirect(new URL("/login", request.url)); }
}
export const config = { matcher: ["/((?!.*\\.).*)"] };
