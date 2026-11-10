import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = await prisma.user.findFirst({ where: { email, isActive: true }, select: { id: true, companyId: true, name: true, email: true, role: true, passwordHash: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ userId: user.id, companyId: user.companyId, name: user.name, email: user.email, role: user.role });
  return NextResponse.json({ ok: true });
}
