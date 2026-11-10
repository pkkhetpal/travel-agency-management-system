import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { optionalText } from "@/lib/workflow-utils";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const existing = await prisma.supplier.findFirst({ where: { id: params.id, companyId: session.companyId } });
    if (!existing) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Supplier name is required." }, { status: 400 });
    const email = optionalText(body.email)?.toLowerCase() ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid supplier email address." }, { status: 400 });
    }
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name,
        category: optionalText(body.category),
        contactName: optionalText(body.contactName),
        email,
        phone: optionalText(body.phone),
        country: optionalText(body.country),
        taxNumber: optionalText(body.taxNumber),
        notes: optionalText(body.notes),
        isActive: body.isActive !== false,
      },
      include: { _count: { select: { bookings: true, bills: true } } },
    });
    return NextResponse.json({ supplier });
  } catch {
    return NextResponse.json({ error: "Could not update supplier." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: { _count: { select: { bookings: true, bills: true } } },
    });
    if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    if (supplier._count.bookings + supplier._count.bills > 0) {
      return NextResponse.json({ error: "This supplier is linked to travel records or bills. Edit the supplier and mark it inactive instead." }, { status: 409 });
    }
    await prisma.supplier.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete supplier." }, { status: 400 });
  }
}
