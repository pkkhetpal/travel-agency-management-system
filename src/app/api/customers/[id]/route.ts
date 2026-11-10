import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const b = await request.json();
    const exists = await prisma.customer.findFirst({ where: { id: params.id, companyId: session.companyId } });
    if (!exists) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const customer = await prisma.customer.update({ where: { id: params.id }, data: { name: String(b.name || "").trim(), email: b.email ? String(b.email).trim().toLowerCase() : null, mobile: b.mobile ? String(b.mobile).trim() : null, alternateMobile: b.alternateMobile ? String(b.alternateMobile).trim() : null, address: b.address ? String(b.address).trim() : null, city: b.city ? String(b.city).trim() : null, state: b.state ? String(b.state).trim() : null, country: b.country ? String(b.country).trim() : "India", notes: b.notes ? String(b.notes).trim() : null } });
    return NextResponse.json({ customer });
  } catch { return NextResponse.json({ error: "Could not update customer." }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const exists = await prisma.customer.findFirst({ where: { id: params.id, companyId: session.companyId } });
    if (!exists) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const linked = await prisma.customer.findUnique({ where: { id: params.id }, select: { _count: { select: { enquiries: true, quotations: true, packages: true } } } });
    if (linked && linked._count.enquiries + linked._count.quotations + linked._count.packages > 0) return NextResponse.json({ error: "This customer has travel records. Edit the profile instead of deleting it." }, { status: 409 });
    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not delete customer." }, { status: 400 }); }
}
