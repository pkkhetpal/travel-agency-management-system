import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, nonNegativeAmount, optionalText } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const methods = ["CASH", "BANK_TRANSFER", "UPI", "CARD", "PAYMENT_LINK", "OTHER"];

export async function GET() {
  try {
    const session = await requireSession();
    const receipts = await prisma.customerReceipt.findMany({
      where: { companyId: session.companyId },
      include: { travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } } },
      orderBy: { receivedAt: "desc" }, take: 500,
    });
    const packages = await prisma.travelPackage.findMany({
      where: { companyId: session.companyId },
      select: { id: true, title: true, referenceNo: true, saleAmount: true, currency: true, customer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" }, take: 250,
    });
    return NextResponse.json({ receipts, packages });
  } catch {
    return NextResponse.json({ error: "Please sign in to view customer receipts." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const packageId = String(body.packageId || "").trim();
    const amount = nonNegativeAmount(body.amount, "Receipt amount", 0);
    const currency = currencyCode(body.currency);
    const method = String(body.method || "").toUpperCase();
    if (!packageId) return NextResponse.json({ error: "Choose a travel package for this receipt." }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ error: "Receipt amount must be greater than zero." }, { status: 400 });
    if (!methods.includes(method)) return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
    const pkg = await prisma.travelPackage.findFirst({ where: { id: packageId, companyId: session.companyId }, select: { id: true } });
    if (!pkg) return NextResponse.json({ error: "The selected package was not found in your agency." }, { status: 400 });
    const receivedAt = dateOrNull(body.receivedAt, "Receipt date") || new Date();
    const receipt = await prisma.customerReceipt.create({
      data: {
        companyId: session.companyId, packageId,
        receiptNo: `RCPT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        receivedAt, amount, currency, method: method as PaymentMethod,
        reference: optionalText(body.reference), notes: optionalText(body.notes), status: "OPEN",
      },
      include: { travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } } },
    });
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save receipt.";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
