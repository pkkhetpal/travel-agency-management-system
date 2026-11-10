import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOrNull } from "@/lib/workflow-utils";

export const runtime = "nodejs";

function range(from: Date | null, to: Date | null) {
  if (from && to && to < from) throw new Error("End date cannot be before start date.");
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}) };
}

function byCurrency(rows: Array<{ currency: string; amount: unknown }>) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) || 0) + Number(row.amount || 0));
  return Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }));
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    let from: Date | null;
    let to: Date | null;
    try {
      from = dateOrNull(url.searchParams.get("from"), "Start date");
      to = dateOrNull(url.searchParams.get("to"), "End date");
      range(from, to);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid date range." }, { status: 400 });
    }

    const [packages, bookings, receipts, bills, customers, suppliers] = await Promise.all([
      prisma.travelPackage.findMany({
        where: { companyId: session.companyId, ...(from || to ? { travelStart: range(from, to) } : {}) },
        select: { currency: true, saleAmount: true },
        take: 5000,
      }),
      prisma.booking.findMany({
        where: { travelPackage: { companyId: session.companyId }, ...(from || to ? { serviceDate: range(from, to) } : {}) },
        select: { costCurrency: true, supplierCost: true },
        take: 10000,
      }),
      prisma.customerReceipt.findMany({
        where: { companyId: session.companyId, status: { not: "VOID" }, ...(from || to ? { receivedAt: range(from, to) } : {}) },
        select: { currency: true, amount: true },
        take: 10000,
      }),
      prisma.supplierBill.findMany({
        where: { companyId: session.companyId, status: { not: "VOID" }, ...(from || to ? { billDate: range(from, to) } : {}) },
        select: { currency: true, amount: true },
        take: 10000,
      }),
      prisma.customer.count({ where: { companyId: session.companyId } }),
      prisma.supplier.count({ where: { companyId: session.companyId, isActive: true } }),
    ]);

    return NextResponse.json({
      filters: { from: from?.toISOString().slice(0, 10) || null, to: to?.toISOString().slice(0, 10) || null },
      counts: { customers, activeSuppliers: suppliers, packages: packages.length, bookings: bookings.length, receipts: receipts.length, supplierBills: bills.length },
      totals: {
        packageSalesByCurrency: byCurrency(packages.map((p) => ({ currency: p.currency, amount: p.saleAmount }))),
        bookingSupplierCostsByCurrency: byCurrency(bookings.map((b) => ({ currency: b.costCurrency, amount: b.supplierCost }))),
        customerReceiptsByCurrency: byCurrency(receipts.map((r) => ({ currency: r.currency, amount: r.amount }))),
        supplierBillsByCurrency: byCurrency(bills.map((b) => ({ currency: b.currency, amount: b.amount }))),
      },
      notes: [
        "Totals are grouped by currency. Amounts in different currencies are not combined.",
        "Package sales are entered package values, not recognized revenue.",
        "Customer receipts are cash received, not a revenue recognition measure.",
        "Booking supplier costs and supplier bills are separate views and should not be added together.",
        "GST and accounting treatment should be reviewed with your accountant.",
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate reports.";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : "Could not generate reports. Please try again." }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
