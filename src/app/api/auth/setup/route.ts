import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const companyName = String(body.companyName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!name || !companyName || !/^\\S+@\\S+\\.\\S+$/.test(email) || password.length < 12) return NextResponse.json({ error: "Enter your name, agency name, valid email and a password of at least 12 characters." }, { status: 400 });
    const existing = await prisma.user.count();
    if (existing > 0) return NextResponse.json({ error: "Initial setup has already been completed. Please sign in." }, { status: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async tx => {
      const company = await tx.company.create({ data: { name: companyName, baseCurrency: "INR", timezone: "Asia/Kolkata" } });
      return tx.user.create({ data: { companyId: company.id, name, email, passwordHash, role: "OWNER" } });
    });
    await createSession({ userId: user.id, companyId: user.companyId, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Owner setup failed", error); return NextResponse.json({ error: "Could not complete setup. Check that the database is configured." }, { status: 500 }); }
}
