import { NextResponse } from "next/server";
import { EnquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, nonNegativeAmount, optionalText, wholeNumber } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const statuses = ["NEW", "FOLLOW_UP", "QUOTED", "CONVERTED", "LOST"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  try {
    const body = await request.json();
    const status = String(body.status || "NEW");
    if (!statuses.includes(status)) return NextResponse.json({ error: "Choose a valid enquiry status." }, { status: 400 });
    const customerId = String(body.customerId || "");
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: session.companyId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Choose a customer from your agency." }, { status: 400 });
    const travelStart = dateOrNull(body.travelStart, "Travel start");
    const travelEnd = dateOrNull(body.travelEnd, "Travel end");
    if (travelStart && travelEnd && travelEnd < travelStart) return NextResponse.json({ error: "Travel end cannot be before travel start." }, { status: 400 });
    const exists = await prisma.enquiry.findFirst({ where: { id: params.id, companyId: session.companyId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    const enquiry = await prisma.enquiry.update({
      where: { id: params.id },
      data: {
        customerId, destination: optionalText(body.destination), travelStart, travelEnd,
        adults: wholeNumber(body.adults, "Adults", 1, 1),
        children: wholeNumber(body.children, "Children", 0, 0),
        budget: body.budget === "" || body.budget === null || body.budget === undefined ? null : nonNegativeAmount(body.budget, "Budget"),
        currency: currencyCode(body.currency), travelType: optionalText(body.travelType),
        notes: optionalText(body.notes), status: status as EnquiryStatus,
        nextFollowUp: dateOrNull(body.nextFollowUp, "Follow-up date"),
      },
      include: { customer: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ enquiry });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update enquiry." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  const enquiry = await prisma.enquiry.findFirst({
    where: { id: params.id, companyId: session.companyId },
    select: { id: true, _count: { select: { quotations: true } } },
  });
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  if (enquiry._count.quotations > 0) return NextResponse.json({ error: "This enquiry has linked quotations. Change its status instead of deleting it." }, { status: 409 });
  await prisma.enquiry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
