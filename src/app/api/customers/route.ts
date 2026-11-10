import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    const customers = await prisma.customer.findMany({ where: { companyId: session.companyId, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { mobile: { contains: q } }] } : {}) }, orderBy: { updatedAt: "desc" }, take: 100 });
    return NextResponse.json({ customers });
  } catch (e) { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
}
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const b = await request.json();
    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    const customer = await prisma.customer.create({ data: { companyId: session.companyId, name, email: b.email ? String(b.email).trim().toLowerCase() : null, mobile: b.mobile ? String(b.mobile).trim() : null, alternateMobile: b.alternateMobile ? String(b.alternateMobile).trim() : null, address: b.address ? String(b.address).trim() : null, city: b.city ? String(b.city).trim() : null, state: b.state ? String(b.state).trim() : null, country: b.country ? String(b.country).trim() : "India", notes: b.notes ? String(b.notes).trim() : null } } });
    return NextResponse.json({ customer }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not save customer. Please sign in and try again." }, { status: 401 }); }
}
