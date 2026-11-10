import { NextResponse } from "next/server";
import { EnquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, makeReference, nonNegativeAmount, optionalText, wholeNumber } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const statuses = ["NEW", "FOLLOW_UP", "QUOTED", "CONVERTED", "LOST"];

function enquiryData(body: Record<string, unknown>) {
  const status = String(body.status || "NEW");
  if (!statuses.includes(status)) throw new Error("Choose a valid enquiry status.");
  const travelStart = dateOrNull(body.travelStart, "Travel start");
  const travelEnd = dateOrNull(body.travelEnd, "Travel end");
  if (travelStart && travelEnd && travelEnd < travelStart) throw new Error("Travel end cannot be before travel start.");
  return {
    customerId: String(body.customerId || ""),
    destination: optionalText(body.destination),
    travelStart,
    travelEnd,
    adults: wholeNumber(body.adults, "Adults", 1, 1),
    children: wholeNumber(body.children, "Children", 0, 0),
    budget: body.budget === "" || body.budget === null || body.budget === undefined ? null : nonNegativeAmount(body.budget, "Budget"),
    currency: currencyCode(body.currency),
    travelType: optionalText(body.travelType),
    notes: optionalText(body.notes),
    status: status as EnquiryStatus,
    nextFollowUp: dateOrNull(body.nextFollowUp, "Follow-up date"),
  };
}

export async function GET(request: Request) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  const enquiries = await prisma.enquiry.findMany({
    where: {
      companyId: session.companyId,
      ...(q ? { OR: [
        { referenceNo: { contains: q, mode: "insensitive" } },
        { destination: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ enquiries });
}

export async function POST(request: Request) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  try {
    const body = await request.json();
    const data = enquiryData(body);
    if (!data.customerId) return NextResponse.json({ error: "Choose a customer for this enquiry." }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, companyId: session.companyId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "That customer does not belong to this agency." }, { status: 400 });
    const enquiry = await prisma.enquiry.create({
      data: { ...data, companyId: session.companyId, referenceNo: makeReference("ENQ") },
      include: { customer: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ enquiry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create enquiry." }, { status: 400 });
  }
}
