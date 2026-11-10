import { NextResponse } from "next/server";
import { EnquiryStatus, QuotationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, makeReference, nonNegativeAmount, optionalText } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const statuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

function quotationData(body: Record<string, unknown>) {
  const status = String(body.status || "DRAFT");
  if (!statuses.includes(status)) throw new Error("Choose a valid quotation status.");
  const subtotal = nonNegativeAmount(body.subtotal, "Subtotal");
  const discount = nonNegativeAmount(body.discount, "Discount");
  const taxAmount = nonNegativeAmount(body.taxAmount, "Tax");
  const totalAmount = Math.round((subtotal - discount + taxAmount) * 100) / 100;
  if (totalAmount < 0) throw new Error("Discount cannot make the quotation total negative.");
  return {
    customerId: String(body.customerId || ""),
    enquiryId: optionalText(body.enquiryId),
    title: String(body.title || "").trim(),
    currency: currencyCode(body.currency),
    subtotal, discount, taxAmount, totalAmount,
    status: status as QuotationStatus,
    validUntil: dateOrNull(body.validUntil, "Valid until"),
    notes: optionalText(body.notes),
  };
}

export async function GET(request: Request) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  const quotations = await prisma.quotation.findMany({
    where: {
      companyId: session.companyId,
      ...(q ? { OR: [
        { referenceNo: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: { customer: { select: { id: true, name: true } }, enquiry: { select: { id: true, referenceNo: true, destination: true } } },
    orderBy: { updatedAt: "desc" }, take: 200,
  });
  return NextResponse.json({ quotations });
}

export async function POST(request: Request) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  try {
    const body = await request.json();
    const data = quotationData(body);
    if (!data.customerId || !data.title) return NextResponse.json({ error: "Choose a customer and enter a quotation title." }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, companyId: session.companyId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Choose a customer from your agency." }, { status: 400 });
    if (data.enquiryId) {
      const enquiry = await prisma.enquiry.findFirst({ where: { id: data.enquiryId, companyId: session.companyId, customerId: data.customerId }, select: { id: true } });
      if (!enquiry) return NextResponse.json({ error: "The selected enquiry does not belong to this customer and agency." }, { status: 400 });
    }
    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: { ...data, enquiryId: data.enquiryId || null, companyId: session.companyId, referenceNo: makeReference("QT") },
        include: { customer: { select: { id: true, name: true } }, enquiry: { select: { id: true, referenceNo: true, destination: true } } },
      });
      if (data.enquiryId && data.status !== "DRAFT") {
        await tx.enquiry.updateMany({ where: { id: data.enquiryId, companyId: session.companyId }, data: { status: EnquiryStatus.QUOTED } });
      }
      return created;
    });
    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create quotation." }, { status: 400 });
  }
}
