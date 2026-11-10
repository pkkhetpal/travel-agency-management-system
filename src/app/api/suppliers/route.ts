import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { optionalText } from "@/lib/workflow-utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: session.companyId },
      include: { _count: { select: { bookings: true, bills: true } } },
      orderBy: { name: "asc" },
      take: 250,
    });
    return NextResponse.json({ suppliers });
  } catch {
    return NextResponse.json({ error: "Please sign in to view suppliers." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Supplier name is required." }, { status: 400 });
    const email = optionalText(body.email)?.toLowerCase() ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid supplier email address." }, { status: 400 });
    }
    const supplier = await prisma.supplier.create({
      data: {
        companyId: session.companyId,
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
    return NextResponse.json({ supplier }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save supplier. Please try again." }, { status: 400 });
  }
}
