import { notFound } from "next/navigation";
import { TripFileWorkspace } from "@/components/trip-file-workspace";
import { requirePageSession } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TripFilePage({ params }: { params: { id: string } }) {
  const session = await requirePageSession();
  const [trip, company] = await Promise.all([
    prisma.travelPackage.findFirst({
      where: { id: params.id, companyId: session.companyId },
      select: {
        id: true,
        referenceNo: true,
        title: true,
        destination: true,
        travelStart: true,
        travelEnd: true,
        adults: true,
        children: true,
        status: true,
        currency: true,
        saleAmount: true,
        notes: true,
        customer: { select: { name: true, email: true, mobile: true } },
        quotation: { select: { referenceNo: true, title: true } },
        bookings: {
          orderBy: [{ serviceDate: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            referenceNo: true,
            serviceType: true,
            description: true,
            serviceDate: true,
            confirmationNo: true,
            status: true,
            supplier: { select: { name: true, contactName: true, phone: true, email: true } },
          },
        },
        itineraryDays: {
          orderBy: { dayNumber: "asc" },
          select: { id: true, dayNumber: true, date: true, title: true, description: true, hotel: true, meals: true },
        },
        receipts: {
          where: { status: { not: "VOID" } },
          orderBy: { receivedAt: "desc" },
          select: { id: true, receiptNo: true, receivedAt: true, amount: true, currency: true, method: true, reference: true, status: true },
        },
        supplierBills: {
          where: { status: { not: "VOID" } },
          orderBy: { billDate: "desc" },
          select: {
            id: true,
            billNo: true,
            billDate: true,
            dueDate: true,
            amount: true,
            currency: true,
            status: true,
            supplier: { select: { name: true } },
            payments: { select: { amount: true } },
          },
        },
      },
    }),
    prisma.company.findUnique({
      where: { id: session.companyId },
      select: { email: true, phone: true, address: true },
    }),
  ]);

  if (!trip) notFound();

  return <TripFileWorkspace data={{
    agency: { email: company?.email || null, phone: company?.phone || null, address: company?.address || null },
    trip: {
      id: trip.id,
      referenceNo: trip.referenceNo,
      title: trip.title,
      destination: trip.destination,
      travelStart: trip.travelStart?.toISOString() || null,
      travelEnd: trip.travelEnd?.toISOString() || null,
      adults: trip.adults,
      children: trip.children,
      status: trip.status,
      currency: trip.currency,
      saleAmount: String(trip.saleAmount),
      notes: trip.notes,
    },
    customer: trip.customer,
    quotation: trip.quotation,
    bookings: trip.bookings.map((booking) => ({
      ...booking,
      serviceDate: booking.serviceDate?.toISOString() || null,
    })),
    itineraryDays: trip.itineraryDays.map((day) => ({
      ...day,
      date: day.date?.toISOString() || null,
    })),
    receipts: trip.receipts.map((receipt) => ({
      ...receipt,
      receivedAt: receipt.receivedAt.toISOString(),
      amount: String(receipt.amount),
    })),
    supplierBills: trip.supplierBills.map((bill) => ({
      ...bill,
      billDate: bill.billDate.toISOString(),
      dueDate: bill.dueDate?.toISOString() || null,
      amount: String(bill.amount),
      payments: bill.payments.map((payment) => ({ amount: String(payment.amount) })),
    })),
  }} />;
}
