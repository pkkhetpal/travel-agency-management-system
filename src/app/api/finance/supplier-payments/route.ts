import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { currencyCode, dateOrNull, nonNegativeAmount, optionalText } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const methods = ["CASH", "BANK_TRANSFER", "UPI", "CARD", "PAYMENT_LINK", "OTHER"];

export async function GET() {
  try {
    const session = await requireSession();
    const payments = await prisma.supplierPayment.findMany({
      where: { companyId: session.companyId },
      include: {
        allocations: {
          include: {
            bill: {
              select: {
                id: true,
                billNo: true,
                supplier: { select: { name: true } },
                travelPackage: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" }, take: 500,
    });
    const bills = await prisma.supplierBill.findMany({
      where: { companyId: session.companyId, status: { not: "VOID" } },
      include: { supplier: { select: { name: true } }, payments: { select: { amount: true } } },
      orderBy: { billDate: "asc" }, take: 500,
    });
    return NextResponse.json({ payments, bills });
  } catch {
    return NextResponse.json({ error: "Please sign in to view supplier payments." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const amount = nonNegativeAmount(body.amount, "Payment amount", 0);
    const currency = currencyCode(body.currency);
    const method = String(body.method || "").toUpperCase();
    const allocations: Array<{ billId?: unknown; amount?: unknown }> = Array.isArray(body.allocations) ? body.allocations : [];
    if (amount <= 0) return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });
    if (!methods.includes(method)) return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
    if (!allocations.length) return NextResponse.json({ error: "Allocate this payment to at least one supplier bill." }, { status: 400 });

    const parsed: Array<{ billId: string; amount: number }> = allocations.map((row) => ({
      billId: String(row.billId || "").trim(),
      amount: nonNegativeAmount(row.amount, "Allocation amount", 0),
    }));
    if (parsed.some((row) => !row.billId || row.amount <= 0)) return NextResponse.json({ error: "Choose bills and enter a positive allocation for each." }, { status: 400 });
    if (new Set(parsed.map((row) => row.billId)).size !== parsed.length) return NextResponse.json({ error: "Each bill can appear only once in a payment." }, { status: 400 });
    const allocatedTotal = Math.round(parsed.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
    if (allocatedTotal > amount) return NextResponse.json({ error: "Allocated amounts cannot exceed the payment amount." }, { status: 400 });

    const supplierId = String(body.supplierId || "").trim();
    if (!supplierId) return NextResponse.json({ error: "Choose the supplier receiving this payment." }, { status: 400 });
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId: session.companyId, isActive: true }, select: { id: true } });
    if (!supplier) return NextResponse.json({ error: "The selected supplier was not found or is inactive in your agency." }, { status: 400 });

    const paidAt = dateOrNull(body.paidAt, "Payment date") || new Date();
    const payment = await prisma.$transaction(async (tx) => {
      const billIds = parsed.map((row) => row.billId);
      const bills = await tx.supplierBill.findMany({
        where: { id: { in: billIds }, companyId: session.companyId },
        include: { payments: { select: { amount: true } } },
      });
      if (bills.length !== billIds.length) throw new Error("One or more bills were not found in your agency.");
      const billMap = new Map(bills.map((bill) => [bill.id, bill]));
      for (const allocation of parsed) {
        const bill = billMap.get(allocation.billId)!;
        if (bill.supplierId !== supplierId) throw new Error("All bills in one supplier payment must belong to the selected supplier.");
        if (bill.status === "VOID") throw new Error("A void bill cannot receive a payment.");
        if (bill.currency !== currency) throw new Error("Payment and allocated bill currencies must match. Record separate payments by currency.");
        const alreadyPaid = bill.payments.reduce((sum, row) => sum + Number(row.amount), 0);
        if (alreadyPaid + allocation.amount > Number(bill.amount) + 0.0001) throw new Error("An allocation would exceed the outstanding amount on bill " + bill.billNo + ".");
      }

      const created = await tx.supplierPayment.create({
        data: {
          companyId: session.companyId,
          paymentNo: `PAY-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          paidAt, amount, currency, method: method as PaymentMethod,
          reference: optionalText(body.reference), notes: optionalText(body.notes),
          allocations: { create: parsed.map((row) => ({ billId: row.billId, amount: row.amount })) },
        },
        include: {
          allocations: {
            include: {
              bill: {
                select: {
                  id: true,
                  billNo: true,
                  supplier: { select: { name: true } },
                  travelPackage: { select: { title: true } },
                },
              },
            },
          },
        },
      });
      for (const allocation of parsed) {
        const bill = billMap.get(allocation.billId)!;
        const paidAfter = bill.payments.reduce((sum, row) => sum + Number(row.amount), 0) + allocation.amount;
        await tx.supplierBill.update({
          where: { id: bill.id },
          data: { status: paidAfter >= Number(bill.amount) - 0.0001 ? "PAID" : "PARTIALLY_PAID" },
        });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record supplier payment.";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
