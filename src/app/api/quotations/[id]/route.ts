import { NextResponse } from "next/server";
import { QuotationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, nonNegativeAmount, optionalText } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const statuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  try {
    const body = await request.json();
    const status = String(body.status || "DRAFT");
    if (!statuses.includes(status)) return NextResponse.json({ error: "Choose a valid quotation status." }, { status: 400 });
    const customerId = String(body.customerId || "");
    const title = String(body.title || "").trim();
    if (!customerId || !title) return NextResponse.json({ error: "Choose a customer and enter a quotation title." }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: session.companyId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "Choose a customer from your agency." }, { status: 400 });
    const enquiryId = optionalText(body.enquiryId);
    if (enquiryId) {
      const enquiry = await prisma.enquiry.findFirst({ where: { id: enquiryId, companyId: session.companyId, customerId }, select: { id: true } });
      if (!enquiry) return NextResponse.json({ error: "The selected enquiry does not belong to this customer and agency." }, { status: 400 });
    }
    const exists = await prisma.quotation.findFirst({ where: { id: params.id, companyId: session.companyId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    const subtotal = nonNegativeAmount(body.subtotal, "Subtotal");
    const discount = nonNegativeAmount(body.discount, "Discount");
    const taxAmount = nonNegativeAmount(body.taxAmount, "Tax");
    const totalAmount = Math.round((subtotal - discount + taxAmount) * 100) / 100;
    if (totalAmount < 0) return NextResponse.json({ error: "Discount cannot make the quotation total negative." }, { status: 400 });
    const quotation = await prisma.quotation.update({
      where: { id: params.id },
      data: {
        customerId, enquiryId, title, currency: currencyCode(body.currency),
        subtotal, discount, taxAmount, totalAmount, status: status as QuotationStatus,
        validUntil: dateOrNull(body.validUntil, "Valid until"), notes: optionalText(body.notes),
      },
      include: { customer: { select: { id: true, name: true } }, enquiry: { select: { id: true, referenceNo: true, destination: true } } },
    });
    return NextResponse.json({ quotation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update quotation." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Please sign in." }, { status: 401 }); }
  const quotation = await prisma.quotation.findFirst({
    where: { id: params.id, companyId: session.companyId },
    select: { id: true, _count: { select: { packages: true } } },
  });
  if (!quotation) return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
  if (quotation._count.packages > 0) return NextResponse.json({ error: "This quotation has a linked travel package. Change its status instead of deleting it." }, { status: 409 });
  await prisma.quotation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
