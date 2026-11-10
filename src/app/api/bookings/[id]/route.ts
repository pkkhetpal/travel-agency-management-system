import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, nonNegativeAmount, optionalText, positiveRate } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const serviceTypes = ["FLIGHT", "HOTEL", "TRANSFER", "ACTIVITY", "VISA", "CRUISE", "INSURANCE", "OTHER"];
const statuses = ["REQUESTED", "ON_HOLD", "CONFIRMED", "CANCELLED", "COMPLETED"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const existing = await prisma.booking.findFirst({
      where: { id: params.id, travelPackage: { companyId: session.companyId } },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    const body = await request.json();
    const packageId = String(body.packageId || "").trim();
    const description = String(body.description || "").trim();
    const serviceType = String(body.serviceType || "").toUpperCase();
    const status = String(body.status || "REQUESTED").toUpperCase();
    if (!packageId) return NextResponse.json({ error: "Choose a travel package." }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Booking description is required." }, { status: 400 });
    if (!serviceTypes.includes(serviceType)) return NextResponse.json({ error: "Choose a valid service type." }, { status: 400 });
    if (!statuses.includes(status)) return NextResponse.json({ error: "Choose a valid booking status." }, { status: 400 });
    const travelPackage = await prisma.travelPackage.findFirst({ where: { id: packageId, companyId: session.companyId }, select: { id: true } });
    if (!travelPackage) return NextResponse.json({ error: "The selected package was not found in your agency." }, { status: 400 });
    const supplierId = optionalText(body.supplierId);
    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId: session.companyId }, select: { id: true } });
      if (!supplier) return NextResponse.json({ error: "The selected supplier was not found in your agency." }, { status: 400 });
    }
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        packageId,
        supplierId,
        serviceType: serviceType as "FLIGHT" | "HOTEL" | "TRANSFER" | "ACTIVITY" | "VISA" | "CRUISE" | "INSURANCE" | "OTHER",
        description,
        serviceDate: dateOrNull(body.serviceDate, "Service date"),
        confirmationNo: optionalText(body.confirmationNo),
        status: status as "REQUESTED" | "ON_HOLD" | "CONFIRMED" | "CANCELLED" | "COMPLETED",
        supplierCost: nonNegativeAmount(body.supplierCost, "Supplier cost", 0),
        costCurrency: currencyCode(body.costCurrency),
        costExchangeRate: positiveRate(body.costExchangeRate, "Cost exchange rate", 1),
      },
      include: {
        travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } },
        supplier: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update booking.";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const booking = await prisma.booking.findFirst({ where: { id: params.id, travelPackage: { companyId: session.companyId } }, select: { id: true } });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete booking." }, { status: 400 });
  }
}
