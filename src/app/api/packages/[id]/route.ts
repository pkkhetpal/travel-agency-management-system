import { NextResponse } from "next/server";
import { PackageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, nonNegativeAmount, optionalText, positiveRate, wholeNumber } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const statuses = ["DRAFT", "PLANNING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  try {
    const body = await request.json();
    const status = String(body.status || "DRAFT");
    if (!statuses.includes(status)) return NextResponse.json({ error: "Choose a valid package status." }, { status: 400 });
    const customerId = String(body.customerId || "");
    const title = String(body.title || "").trim();
    if (!customerId || !title) return NextResponse.json({ error: "Choose a customer and enter a package title." }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: session.companyId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Choose a customer from your agency." }, { status: 400 });
    const quotationId = optionalText(body.quotationId);
    if (quotationId) {
      const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, companyId: session.companyId, customerId }, select: { id: true } });
      if (!quotation) return NextResponse.json({ error: "The selected quotation does not belong to this customer and agency." }, { status: 400 });
    }
    const travelStart = dateOrNull(body.travelStart, "Travel start");
    const travelEnd = dateOrNull(body.travelEnd, "Travel end");
    if (travelStart && travelEnd && travelEnd < travelStart) return NextResponse.json({ error: "Travel end cannot be before travel start." }, { status: 400 });
    const exists = await prisma.travelPackage.findFirst({ where: { id: params.id, companyId: session.companyId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Package not found." }, { status: 404 });
    const pkg = await prisma.travelPackage.update({
      where: { id: params.id },
      data: {
        customerId, quotationId, title, destination: optionalText(body.destination), travelStart, travelEnd,
        adults: wholeNumber(body.adults, "Adults", 1, 1),
        children: wholeNumber(body.children, "Children", 0, 0),
        currency: currencyCode(body.currency), exchangeRate: positiveRate(body.exchangeRate, "Exchange rate"),
        saleAmount: nonNegativeAmount(body.saleAmount, "Sale amount"), status: status as PackageStatus,
        notes: optionalText(body.notes),
      },
      include: { customer: { select: { id: true, name: true } }, quotation: { select: { id: true, referenceNo: true, title: true } } },
    });
    return NextResponse.json({ package: pkg });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update package." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  const pkg = await prisma.travelPackage.findFirst({
    where: { id: params.id, companyId: session.companyId },
    select: { id: true, _count: { select: { bookings: true, itineraryDays: true, receipts: true, supplierBills: true } } },
  });
  if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });
  const linked = pkg._count.bookings + pkg._count.itineraryDays + pkg._count.receipts + pkg._count.supplierBills;
  if (linked > 0) return NextResponse.json({ error: "This package has bookings, itinerary or finance records. Change its status to Cancelled instead of deleting it." }, { status: 409 });
  await prisma.travelPackage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
