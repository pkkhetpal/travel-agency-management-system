import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOrNull } from "@/lib/workflow-utils";

export const runtime = "nodejs";
const types = ["packages", "bookings", "receipts", "supplier-bills"] as const;
type ExportType = typeof types[number];

function csvCell(value: unknown) {
  let raw = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (/^[=+@\-\t\r]/.test(raw)) raw = "'" + raw;
  return '"' + raw.replaceAll('"', '""') + '"';
}

function csv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function makeRange(from: Date | null, to: Date | null) {
  if (from && to && to < from) throw new Error("End date cannot be before start date.");
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}) };
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as ExportType | null;
    if (!type || !types.includes(type)) return NextResponse.json({ error: "Choose a supported report to export." }, { status: 400 });
    const from = dateOrNull(url.searchParams.get("from"), "Start date");
    const to = dateOrNull(url.searchParams.get("to"), "End date");
    const dates = makeRange(from, to);
    let content = "";
    let filename = "";

    if (type === "packages") {
      const records = await prisma.travelPackage.findMany({
        where: { companyId: session.companyId, ...(dates ? { travelStart: dates } : {}) },
        include: { customer: { select: { name: true } } },
        orderBy: { travelStart: "asc" }, take: 10000,
      });
      content = csv(
        ["Package reference", "Package title", "Customer", "Destination", "Travel start", "Travel end", "Adults", "Children", "Status", "Currency", "Sale amount"],
        records.map((p) => [p.referenceNo, p.title, p.customer.name, p.destination, p.travelStart, p.travelEnd, p.adults, p.children, p.status, p.currency, p.saleAmount]),
      );
      filename = "traveldesk-packages.csv";
    } else if (type === "bookings") {
      const records = await prisma.booking.findMany({
        where: { travelPackage: { companyId: session.companyId }, ...(dates ? { serviceDate: dates } : {}) },
        include: { travelPackage: { include: { customer: { select: { name: true } } } }, supplier: { select: { name: true } } },
        orderBy: { serviceDate: "asc" }, take: 10000,
      });
      content = csv(
        ["Booking reference", "Service type", "Description", "Package", "Customer", "Supplier", "Service date", "Confirmation number", "Status", "Supplier cost", "Cost currency", "Cost exchange rate"],
        records.map((b) => [b.referenceNo, b.serviceType, b.description, b.travelPackage.title, b.travelPackage.customer.name, b.supplier?.name, b.serviceDate, b.confirmationNo, b.status, b.supplierCost, b.costCurrency, b.costExchangeRate]),
      );
      filename = "traveldesk-bookings.csv";
    } else if (type === "receipts") {
      const records = await prisma.customerReceipt.findMany({
        where: { companyId: session.companyId, ...(dates ? { receivedAt: dates } : {}) },
        include: { travelPackage: { include: { customer: { select: { name: true } } } } },
        orderBy: { receivedAt: "asc" }, take: 10000,
      });
      content = csv(
        ["Receipt number", "Received date", "Customer", "Package", "Amount", "Currency", "Method", "Reference", "Status", "Notes"],
        records.map((r) => [r.receiptNo, r.receivedAt, r.travelPackage.customer.name, r.travelPackage.title, r.amount, r.currency, r.method, r.reference, r.status, r.notes]),
      );
      filename = "traveldesk-customer-receipts.csv";
    } else {
      const records = await prisma.supplierBill.findMany({
        where: { companyId: session.companyId, ...(dates ? { billDate: dates } : {}) },
        include: { supplier: { select: { name: true } }, travelPackage: { include: { customer: { select: { name: true } } } } },
        orderBy: { billDate: "asc" }, take: 10000,
      });
      content = csv(
        ["Bill number", "Supplier invoice number", "Bill date", "Due date", "Supplier", "Package", "Customer", "Amount", "Tax amount", "Currency", "Status", "Notes"],
        records.map((b) => [b.billNo, b.supplierInvoiceNo, b.billDate, b.dueDate, b.supplier.name, b.travelPackage.title, b.travelPackage.customer.name, b.amount, b.taxAmount, b.currency, b.status, b.notes]),
      );
      filename = "traveldesk-supplier-bills.csv";
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export report.";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : message }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
