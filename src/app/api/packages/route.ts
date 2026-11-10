import { NextResponse } from "next/server";
import { EnquiryStatus, PackageStatus, QuotationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, makeReference, nonNegativeAmount, optionalText, positiveRate, wholeNumber } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const statuses = ["DRAFT", "PLANNING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function packageData(body: Record<string, unknown>) {
  const status = String(body.status || "DRAFT");
  if (!statuses.includes(status)) throw new Error("Choose a valid package status.");
  const travelStart = dateOrNull(body.travelStart, "Travel start");
  const travelEnd = dateOrNull(body.travelEnd, "Travel end");
  if (travelStart && travelEnd && travelEnd < travelStart) throw new Error("Travel end cannot be before travel start.");
  return {
    customerId: String(body.customerId || ""),
    quotationId: optionalText(body.quotationId),
    title: String(body.title || "").trim(),
    destination: optionalText(body.destination),
    travelStart, travelEnd,
    adults: wholeNumber(body.adults, "Adults", 1, 1),
    children: wholeNumber(body.children, "Children", 0, 0),
    currency: currencyCode(body.currency),
    exchangeRate: positiveRate(body.exchangeRate, "Exchange rate"),
    saleAmount: nonNegativeAmount(body.saleAmount, "Sale amount"),
    status: status as PackageStatus,
    notes: optionalText(body.notes),
  };
}

export async function GET(request: Request) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  const packages = await prisma.travelPackage.findMany({
    where: {
      companyId: session.companyId,
      ...(q ? { OR: [
        { referenceNo: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { destination: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: { customer: { select: { id: true, name: true } }, quotation: { select: { id: true, referenceNo: true, title: true } } },
    orderBy: { updatedAt: "desc" }, take: 200,
  });
  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  try {
    const body = await request.json();
    const data = packageData(body);
    if (!data.customerId || !data.title) return NextResponse.json({ error: "Choose a customer and enter a package title." }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, companyId: session.companyId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Choose a customer from your agency." }, { status: 400 });
    if (data.quotationId) {
      const quotation = await prisma.quotation.findFirst({ where: { id: data.quotationId, companyId: session.companyId, customerId: data.customerId }, select: { id: true } });
      if (!quotation) return NextResponse.json({ error: "The selected quotation does not belong to this customer and agency." }, { status: 400 });
    }
    const pkg = await prisma.$transaction(async (tx) => {
      const created = await tx.travelPackage.create({
        data: { ...data, quotationId: data.quotationId || null, companyId: session.companyId, referenceNo: makeReference("PKG") },
        include: { customer: { select: { id: true, name: true } }, quotation: { select: { id: true, referenceNo: true, title: true } } },
      });
      if (data.quotationId) {
        const quotation = await tx.quotation.update({
          where: { id: data.quotationId },
          data: { status: QuotationStatus.ACCEPTED },
          select: { enquiryId: true },
        });
        if (quotation.enquiryId) {
          await tx.enquiry.updateMany({ where: { id: quotation.enquiryId, companyId: session.companyId }, data: { status: EnquiryStatus.CONVERTED } });
        }
      }
      return created;
    });
    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create package." }, { status: 400 });
  }
}
