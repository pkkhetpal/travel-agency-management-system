import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, nonNegativeAmount, optionalText } from "@/lib/workflow-utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    const bills = await prisma.supplierBill.findMany({
      where: { companyId: session.companyId },
      include: {
        supplier: { select: { id: true, name: true } },
        travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } },
        payments: { select: { amount: true, payment: { select: { paymentNo: true, paidAt: true, currency: true } } } },
      },
      orderBy: { billDate: "desc" }, take: 500,
    });
    const [packages, suppliers] = await Promise.all([
      prisma.travelPackage.findMany({ where: { companyId: session.companyId }, select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 250 }),
      prisma.supplier.findMany({ where: { companyId: session.companyId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 250 }),
    ]);
    return NextResponse.json({ bills, packages, suppliers });
  } catch {
    return NextResponse.json({ error: "Please sign in to view supplier bills." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const packageId = String(body.packageId || "").trim();
    const supplierId = String(body.supplierId || "").trim();
    const amount = nonNegativeAmount(body.amount, "Bill amount", 0);
    const taxAmount = nonNegativeAmount(body.taxAmount, "Tax amount", 0);
    const currency = currencyCode(body.currency);
    const billDate = dateOrNull(body.billDate, "Bill date");
    const dueDate = dateOrNull(body.dueDate, "Due date");
    if (!packageId || !supplierId) return NextResponse.json({ error: "Choose a travel package and supplier." }, { status: 400 });
    if (!billDate) return NextResponse.json({ error: "Bill date is required." }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ error: "Bill amount must be greater than zero." }, { status: 400 });
    if (taxAmount > amount) return NextResponse.json({ error: "Tax amount cannot exceed the bill total." }, { status: 400 });
    if (dueDate && dueDate < billDate) return NextResponse.json({ error: "Due date cannot be before bill date." }, { status: 400 });
    const [pkg, supplier] = await Promise.all([
      prisma.travelPackage.findFirst({ where: { id: packageId, companyId: session.companyId }, select: { id: true } }),
      prisma.supplier.findFirst({ where: { id: supplierId, companyId: session.companyId }, select: { id: true } }),
    ]);
    if (!pkg || !supplier) return NextResponse.json({ error: "The selected package or supplier was not found in your agency." }, { status: 400 });
    const bill = await prisma.supplierBill.create({
      data: {
        companyId: session.companyId, packageId, supplierId,
        billNo: `BILL-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        supplierInvoiceNo: optionalText(body.supplierInvoiceNo), billDate, dueDate,
        amount, currency, taxAmount, status: "OPEN", notes: optionalText(body.notes),
      },
      include: { supplier: { select: { id: true, name: true } }, travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } }, payments: true },
    });
    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save supplier bill.";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
