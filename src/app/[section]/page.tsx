import { notFound } from "next/navigation";
import { SectionPage } from "@/components/section-page";
import { requirePageSession } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { SalesWorkspace } from "@/components/sales-workspace";
import { OperationsWorkspace } from "@/components/operations-workspace";
import { FinanceWorkspace, ItineraryWorkspace } from "@/components/itinerary-finance-workspace";

export const dynamic = "force-dynamic";

type Tone = "green" | "blue" | "amber" | "gray";
function tone(status: string): Tone {
  if (["CONFIRMED","COMPLETED","ACCEPTED","PAID","CONVERTED","ACTIVE","READY","SENT"].includes(status)) return "green";
  if (["NEW","REQUESTED","DRAFT","PLANNING","IN_PROGRESS"].includes(status)) return "blue";
  if (["OPEN","PARTIALLY_PAID","FOLLOW_UP","ON_HOLD","PENDING","REJECTED"].includes(status)) return "amber";
  return "gray";
}
function label(status: string) { return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()); }
function formatDate(value: Date | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(value);
}
function money(value: unknown, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}

const definitions = {
  enquiries: { title: "Enquiries", description: "Capture customer requests and keep every follow-up on track.", action: "New enquiry" },
  quotations: { title: "Quotations", description: "Prepare travel proposals and track customer decisions.", action: "Create quotation" },
  packages: { title: "Packages", description: "Organise trips, bookings, suppliers, guests and package details.", action: "New package" },
  bookings: { title: "Bookings", description: "Track flight, hotel, transfer, activity, visa and cruise reservations.", action: "Add booking" },
  suppliers: { title: "Suppliers", description: "Manage hotels, transport partners, DMCs and service providers.", action: "Add supplier" },
  itineraries: { title: "Itineraries", description: "Build and review day-wise travel plans.", action: "Create itinerary" },
  finance: { title: "Receivables & Payables", description: "Review customer receipts and supplier bills recorded for your agency.", action: "Record transaction" },
  reports: { title: "Reports", description: "Review business totals calculated from your agency records.", action: "Export report" },
  settings: { title: "Agency settings", description: "Review the company profile and regional settings used by your agency.", action: "Edit settings" },
} as const;

export default async function Page({ params }: { params: { section: string } }) {
  const session = await requirePageSession();
  const section = params.section;
  if (section === "enquiries" || section === "quotations" || section === "packages") {
    return <SalesWorkspace kind={section} />;
  }
  if (section === "suppliers" || section === "bookings") {
    return <OperationsWorkspace kind={section} />;
  }
  if (section === "itineraries") return <ItineraryWorkspace />;
  if (section === "finance") return <FinanceWorkspace />;
  const definition = definitions[section as keyof typeof definitions];
  if (!definition) notFound();

  let metrics: { label: string; value: string }[] = [];
  let rows: { title: string; subtitle: string; detail: string; status: string; tone: Tone }[] = [];
  let columns: string[] = ["RECORD", "DETAIL"];
  let note: string | undefined;

  if (section === "bookings") {
    const [records, total, requested, confirmed] = await Promise.all([
      prisma.booking.findMany({ where: { travelPackage: { companyId: session.companyId } }, include: { travelPackage: { include: { customer: { select: { name: true } } } }, supplier: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
      prisma.booking.count({ where: { travelPackage: { companyId: session.companyId } } }),
      prisma.booking.count({ where: { travelPackage: { companyId: session.companyId }, status: { in: ["REQUESTED", "ON_HOLD"] } } }),
      prisma.booking.count({ where: { travelPackage: { companyId: session.companyId }, status: "CONFIRMED" } }),
    ]);
    metrics = [{ label: "Total bookings", value: String(total) }, { label: "Awaiting confirmation", value: String(requested) }, { label: "Confirmed", value: String(confirmed) }];
    columns = ["BOOKING / PACKAGE", "SERVICE DATE"];
    rows = records.map((record) => ({ title: label(record.serviceType) + " · " + record.description, subtitle: record.referenceNo + " · " + record.travelPackage.title + " · " + record.travelPackage.customer.name, detail: formatDate(record.serviceDate), status: label(record.status), tone: tone(record.status) }));
  } else if (section === "suppliers") {
    const [records, active, openBills, totalBookings] = await Promise.all([
      prisma.supplier.findMany({ where: { companyId: session.companyId }, include: { _count: { select: { bookings: true, bills: true } } }, orderBy: { name: "asc" }, take: 100 }),
      prisma.supplier.count({ where: { companyId: session.companyId, isActive: true } }),
      prisma.supplierBill.count({ where: { companyId: session.companyId, status: { in: ["OPEN", "PARTIALLY_PAID"] } } }),
      prisma.booking.count({ where: { travelPackage: { companyId: session.companyId } } }),
    ]);
    metrics = [{ label: "Active suppliers", value: String(active) }, { label: "Open supplier bills", value: String(openBills) }, { label: "Bookings recorded", value: String(totalBookings) }];
    columns = ["SUPPLIER", "CONTACT / RECORDS"];
    rows = records.map((record) => ({ title: record.name, subtitle: [record.category, record.contactName].filter(Boolean).join(" · ") || "Supplier", detail: record.email || record.phone || (record._count.bookings + " bookings · " + record._count.bills + " bills"), status: record.isActive ? "Active" : "Inactive", tone: record.isActive ? "green" : "gray" }));
  } else if (section === "itineraries") {
    const [records, totalDays, packages] = await Promise.all([
      prisma.itineraryDay.findMany({ where: { travelPackage: { companyId: session.companyId } }, include: { travelPackage: { include: { customer: { select: { name: true } } } } }, orderBy: [{ date: "asc" }, { dayNumber: "asc" }], take: 100 }),
      prisma.itineraryDay.count({ where: { travelPackage: { companyId: session.companyId } } }),
      prisma.travelPackage.count({ where: { companyId: session.companyId } }),
    ]);
    metrics = [{ label: "Itinerary days", value: String(totalDays) }, { label: "Packages with plans", value: String(new Set(records.map((record) => record.packageId)).size) }, { label: "Total packages", value: String(packages) }];
    columns = ["ITINERARY / PACKAGE", "DATE"];
    rows = records.map((record) => ({ title: "Day " + record.dayNumber + " · " + record.title, subtitle: record.travelPackage.title + " · " + record.travelPackage.customer.name, detail: formatDate(record.date), status: "Saved", tone: "green" }));
  } else if (section === "finance") {
    const [receipts, bills, receiptCount, openBills, paymentCount] = await Promise.all([
      prisma.customerReceipt.findMany({ where: { companyId: session.companyId }, include: { travelPackage: { include: { customer: { select: { name: true } } } } }, orderBy: { receivedAt: "desc" }, take: 50 }),
      prisma.supplierBill.findMany({ where: { companyId: session.companyId }, include: { supplier: { select: { name: true } }, travelPackage: { select: { title: true } } }, orderBy: { billDate: "desc" }, take: 50 }),
      prisma.customerReceipt.count({ where: { companyId: session.companyId } }),
      prisma.supplierBill.count({ where: { companyId: session.companyId, status: { in: ["OPEN", "PARTIALLY_PAID"] } } }),
      prisma.supplierPayment.count({ where: { companyId: session.companyId } }),
    ]);
    metrics = [{ label: "Customer receipts", value: String(receiptCount) }, { label: "Open supplier bills", value: String(openBills) }, { label: "Supplier payments", value: String(paymentCount) }];
    columns = ["PARTY / REFERENCE", "AMOUNT"];
    rows = [
      ...receipts.map((record) => ({ title: record.travelPackage.customer.name + " · Customer receipt", subtitle: record.receiptNo + " · " + record.travelPackage.title, detail: money(record.amount, record.currency), status: label(record.status), tone: tone(record.status) })),
      ...bills.map((record) => ({ title: record.supplier.name + " · Supplier bill", subtitle: record.billNo + " · " + record.travelPackage.title, detail: money(record.amount, record.currency), status: label(record.status), tone: tone(record.status) })),
    ].sort((a, b) => b.subtitle.localeCompare(a.subtitle)).slice(0, 100);
    note = "These are receipts and supplier bills actually recorded in the database. Outstanding balances should be reviewed against allocations before being treated as accounting totals.";
  } else if (section === "reports") {
    const [packageCount, customerCount, bookingCount, sales, receipts, bills] = await Promise.all([
      prisma.travelPackage.count({ where: { companyId: session.companyId } }),
      prisma.customer.count({ where: { companyId: session.companyId } }),
      prisma.booking.count({ where: { travelPackage: { companyId: session.companyId } } }),
      prisma.travelPackage.aggregate({ where: { companyId: session.companyId }, _sum: { saleAmount: true } }),
      prisma.customerReceipt.aggregate({ where: { companyId: session.companyId }, _sum: { amount: true } }),
      prisma.supplierBill.aggregate({ where: { companyId: session.companyId }, _sum: { amount: true } }),
    ]);
    metrics = [{ label: "Customers", value: String(customerCount) }, { label: "Packages", value: String(packageCount) }, { label: "Bookings", value: String(bookingCount) }];
    columns = ["LIVE MEASURE", "PERIOD"];
    rows = [
      { title: "Package sale value", subtitle: "Sum of package sale amounts entered", detail: money(sales._sum.saleAmount), status: "Calculated", tone: "blue" },
      { title: "Customer receipts recorded", subtitle: "Sum of receipt records; not a revenue recognition measure", detail: money(receipts._sum.amount), status: "Calculated", tone: "blue" },
      { title: "Supplier bills recorded", subtitle: "Sum of supplier bill amounts before allocation review", detail: money(bills._sum.amount), status: "Calculated", tone: "blue" },
    ];
  } else if (section === "settings") {
    const company = await prisma.company.findUnique({ where: { id: session.companyId } });
    if (!company) notFound();
    metrics = [{ label: "Default currency", value: company.baseCurrency }, { label: "Time zone", value: company.timezone }, { label: "GSTIN", value: company.gstin || "Not added" }];
    columns = ["AGENCY PROFILE", "VALUE"];
    rows = [
      { title: "Agency name", subtitle: "Registered workspace name", detail: company.name, status: "Saved", tone: "green" },
      { title: "Legal name", subtitle: "Name for invoices", detail: company.legalName || "Not added", status: company.legalName ? "Saved" : "Incomplete", tone: company.legalName ? "green" : "amber" },
      { title: "Email and phone", subtitle: "Agency contact details", detail: [company.email, company.phone].filter(Boolean).join(" · ") || "Not added", status: company.email || company.phone ? "Saved" : "Incomplete", tone: company.email || company.phone ? "green" : "amber" },
      { title: "Business address", subtitle: "Agency address", detail: company.address || "Not added", status: company.address ? "Saved" : "Incomplete", tone: company.address ? "green" : "amber" },
    ];
    note = "This view reflects the company profile saved during first-time setup. Editing these settings is not enabled yet.";
  }

  return <SectionPage config={{ ...definition, metrics, columns, rows, note }} />;
}
