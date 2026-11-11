"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, FileDown, MapPin, Users, Wallet } from "lucide-react";
import { openPrintableDocument } from "@/lib/print-document";

type Booking = {
  id: string;
  referenceNo: string;
  serviceType: string;
  description: string;
  serviceDate: string | null;
  confirmationNo: string | null;
  status: string;
  supplier: { name: string; contactName: string | null; phone: string | null; email: string | null } | null;
};
type ItineraryDay = {
  id: string;
  dayNumber: number;
  date: string | null;
  title: string;
  description: string | null;
  hotel: string | null;
  meals: string | null;
};
type Receipt = {
  id: string;
  receiptNo: string;
  receivedAt: string;
  amount: string;
  currency: string;
  method: string;
  reference: string | null;
  status: string;
};
type SupplierBill = {
  id: string;
  billNo: string;
  billDate: string;
  dueDate: string | null;
  amount: string;
  currency: string;
  status: string;
  supplier: { name: string };
  payments: { amount: string }[];
};
type TripFileData = {
  agency: { email: string | null; phone: string | null; address: string | null };
  trip: {
    id: string;
    referenceNo: string;
    title: string;
    destination: string | null;
    travelStart: string | null;
    travelEnd: string | null;
    adults: number;
    children: number;
    status: string;
    currency: string;
    saleAmount: string;
    notes: string | null;
  };
  customer: { name: string; email: string | null; mobile: string | null };
  quotation: { referenceNo: string; title: string } | null;
  bookings: Booking[];
  itineraryDays: ItineraryDay[];
  receipts: Receipt[];
  supplierBills: SupplierBill[];
};

const dateText = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value))
  : "To be confirmed";
const money = (value: string | number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return String(value || 0) + " " + currency;
  }
};
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusClass = (value: string) => ["CONFIRMED", "COMPLETED", "PAID", "ACCEPTED"].includes(value)
  ? "status-green"
  : ["CANCELLED", "VOID", "REJECTED"].includes(value) ? "status-gray" : "status-amber";

const serviceTitles: Record<string, string> = {
  HOTEL: "Hotel Confirmation Voucher",
  TRANSFER: "Transfer Voucher",
  ACTIVITY: "Sightseeing & Activity Voucher",
  FLIGHT: "Flight Service Voucher",
  VISA: "Visa Service Voucher",
  CRUISE: "Cruise Service Voucher",
  INSURANCE: "Travel Insurance Voucher",
};

export function TripFileWorkspace({ data }: { data: TripFileData }) {
  const { trip, customer } = data;
  const confirmedBookings = data.bookings.filter((booking) => booking.status === "CONFIRMED");
  const receivedByCurrency = data.receipts.reduce<Record<string, number>>((totals, receipt) => {
    totals[receipt.currency] = (totals[receipt.currency] || 0) + Number(receipt.amount || 0);
    return totals;
  }, {});

  function printServiceVoucher(booking: Booking) {
    const support = [
      { label: "Agency address", value: data.agency.address },
      { label: "Phone / WhatsApp", value: data.agency.phone },
      { label: "Email", value: data.agency.email },
    ].filter((entry) => entry.value);
    const serviceLabel = label(booking.serviceType);
    openPrintableDocument({
      agencyName: "Prime Holidays",
      title: serviceTitles[booking.serviceType] || "Travel Service Voucher",
      reference: booking.referenceNo,
      subtitle: [trip.title, trip.destination].filter(Boolean).join(" · "),
      customer: customer.name,
      sections: [
        { title: "Traveller and trip details", entries: [
          { label: "Lead traveller", value: customer.name },
          { label: "Traveller contact", value: [customer.mobile, customer.email].filter(Boolean).join(" · ") || "Contact the agency" },
          { label: "Destination", value: trip.destination || "As per confirmed trip plan" },
          { label: "Travel dates", value: dateText(trip.travelStart) + " to " + dateText(trip.travelEnd) },
          { label: "Travellers", value: trip.adults + " adult(s), " + trip.children + " child(ren)" },
          { label: "Trip reference", value: trip.referenceNo },
        ] },
        { title: "Confirmed service", entries: [
          { label: "Service type", value: serviceLabel },
          { label: "Service details", value: booking.description },
          { label: "Service date", value: dateText(booking.serviceDate) },
          { label: "Hotel / service provider", value: booking.supplier?.name || "As confirmed by Prime Holidays" },
          { label: "Provider contact", value: [booking.supplier?.contactName, booking.supplier?.phone, booking.supplier?.email].filter(Boolean).join(" · ") || undefined },
          { label: "Supplier confirmation", value: booking.confirmationNo || "See service reference" },
          { label: "Voucher reference", value: booking.referenceNo },
          { label: "Booking status", value: "Confirmed" },
        ] },
        { title: "Important instructions", body: "Please present this voucher to the service provider when requested. Reconfirm timings, meeting points, room details, inclusions and any special instructions before travel. Carry valid identification and contact Prime Holidays promptly if any detail needs correction." },
        ...(support.length ? [{ title: "Prime Holidays support", entries: support }] : []),
      ],
    });
  }

  function printCompleteItinerary() {
    const daySections = data.itineraryDays.length
      ? data.itineraryDays.map((day) => ({
          title: "Day " + day.dayNumber + " · " + day.title,
          entries: [
            { label: "Date", value: dateText(day.date) },
            { label: "Hotel", value: day.hotel },
            { label: "Meals", value: day.meals },
          ],
          body: day.description || undefined,
        }))
      : [{ title: "Day-by-day plan", body: "The detailed day-wise itinerary is being prepared. Please contact Prime Holidays for the latest confirmed schedule." }];
    const serviceSections = confirmedBookings.length
      ? [{
          title: "Confirmed services",
          entries: confirmedBookings.flatMap((booking) => [
            { label: label(booking.serviceType) + " · " + booking.referenceNo, value: [
              booking.description,
              dateText(booking.serviceDate),
              booking.supplier?.name,
              booking.confirmationNo ? "Confirmation: " + booking.confirmationNo : "",
            ].filter(Boolean).join(" · ") },
          ]),
        }]
      : [{ title: "Service confirmations", body: "Service confirmations will be added to this itinerary as suppliers confirm each booking." }];
    openPrintableDocument({
      agencyName: "Prime Holidays",
      title: "Complete Holiday Itinerary",
      reference: trip.referenceNo,
      subtitle: [trip.title, trip.destination].filter(Boolean).join(" · "),
      customer: customer.name,
      sections: [
        { title: "Trip overview", entries: [
          { label: "Destination", value: trip.destination || "To be confirmed" },
          { label: "Travel dates", value: dateText(trip.travelStart) + " to " + dateText(trip.travelEnd) },
          { label: "Travellers", value: trip.adults + " adult(s), " + trip.children + " child(ren)" },
          { label: "Trip reference", value: trip.referenceNo },
          { label: "Lead traveller contact", value: [customer.mobile, customer.email].filter(Boolean).join(" · ") || undefined },
        ] },
        ...daySections,
        ...serviceSections,
        ...(data.agency.address || data.agency.phone || data.agency.email ? [{
          title: "Prime Holidays support",
          entries: [
            { label: "Address", value: data.agency.address },
            { label: "Phone / WhatsApp", value: data.agency.phone },
            { label: "Email", value: data.agency.email },
          ],
        }] : []),
      ],
    });
  }

  return <div className="trip-file">
    <div className="trip-back">
      <Link href="/packages">← Trip packages</Link>
      <Link href="/bookings">Bookings register →</Link>
    </div>

    <section className="trip-hero panel">
      <div className="trip-hero-copy">
        <div className="eyebrow">CONNECTED TRIP FILE</div>
        <div className="trip-title-line"><h1>{trip.title}</h1><span className={"status " + statusClass(trip.status)}>{label(trip.status)}</span></div>
        <p>{trip.referenceNo} <span>·</span> {customer.name} <span>·</span> {trip.destination || "Destination to be confirmed"}</p>
      </div>
      <div className="trip-hero-actions">
        <button className="button button-primary" onClick={printCompleteItinerary}><FileDown size={15}/> Print complete itinerary</button>
      </div>
    </section>

    <section className="trip-summary-grid">
      <article className="trip-summary-card"><span><Users size={16}/> LEAD TRAVELLER</span><b>{customer.name}</b><small>{[customer.mobile, customer.email].filter(Boolean).join(" · ") || "Contact details not added"}</small></article>
      <article className="trip-summary-card"><span><MapPin size={16}/> DESTINATION & DATES</span><b>{trip.destination || "To be confirmed"}</b><small>{dateText(trip.travelStart)} – {dateText(trip.travelEnd)}</small></article>
      <article className="trip-summary-card"><span><CalendarDays size={16}/> TRAVELLERS</span><b>{trip.adults} adult(s), {trip.children} child(ren)</b><small>{trip.quotation ? "Linked quotation: " + trip.quotation.referenceNo : "No quotation linked"}</small></article>
      <article className="trip-summary-card"><span><Wallet size={16}/> PACKAGE VALUE</span><b>{money(trip.saleAmount, trip.currency)}</b><small>{trip.currency} · Internal trip overview</small></article>
    </section>

    <div className="trip-content-grid">
      <section className="panel trip-panel">
        <div className="trip-panel-heading"><div><h2>Services & vouchers</h2><p>Every service is attached to this trip reference.</p></div><span className="trip-count">{data.bookings.length} services</span></div>
        {!data.bookings.length ? <div className="trip-empty"><b>No services added yet</b><p>Add hotel, transfer, activity or flight bookings from the bookings register.</p><Link href="/bookings" className="workflow-link">Open bookings register →</Link></div> :
          <div className="trip-service-list">{data.bookings.map((booking) => <article className="trip-service-card" key={booking.id}>
            <div className="trip-service-copy"><div className="trip-service-title"><b>{label(booking.serviceType)} · {booking.description}</b><span className={"status " + statusClass(booking.status)}>{label(booking.status)}</span></div><small>{booking.referenceNo} · {dateText(booking.serviceDate)} · {booking.supplier?.name || "Supplier not assigned"}</small>{booking.confirmationNo && <small>Confirmation: {booking.confirmationNo}</small>}</div>
            {booking.status === "CONFIRMED" && <button className="button button-secondary voucher-button" onClick={() => printServiceVoucher(booking)}><FileDown size={14}/> Voucher</button>}
          </article>)}</div>}
      </section>

      <section className="panel trip-panel">
        <div className="trip-panel-heading"><div><h2>Day-wise itinerary</h2><p>Saved itinerary days for this trip.</p></div><span className="trip-count">{data.itineraryDays.length} days</span></div>
        {!data.itineraryDays.length ? <div className="trip-empty"><b>No itinerary days saved</b><p>Create the day-by-day plan from the Itineraries section.</p><Link href="/itineraries" className="workflow-link">Open itineraries →</Link></div> :
          <div className="trip-day-list">{data.itineraryDays.map((day) => <article className="trip-day" key={day.id}>
            <div className="trip-day-marker">{day.dayNumber}</div>
            <div><b>{day.title}</b><small>{dateText(day.date)}{day.hotel ? " · " + day.hotel : ""}{day.meals ? " · " + day.meals : ""}</small>{day.description && <p>{day.description}</p>}</div>
          </article>)}</div>}
      </section>
    </div>

    <section className="panel trip-panel trip-finance-panel">
      <div className="trip-panel-heading"><div><h2>Payments & supplier bills</h2><p>Internal view only. These figures never appear in client vouchers or itinerary PDFs.</p></div><span className="trip-count">PRIVATE</span></div>
      <div className="trip-finance-grid">
        <div><h3>Customer receipts</h3>{!data.receipts.length ? <p className="trip-ledger-empty">No receipts recorded against this trip.</p> : <div className="trip-ledger-list">
          {data.receipts.map((receipt) => <div className="trip-ledger-row" key={receipt.id}><span><b>{receipt.receiptNo}</b><small>{dateText(receipt.receivedAt)} · {label(receipt.method)} · {label(receipt.status)}</small></span><strong>{money(receipt.amount, receipt.currency)}</strong></div>)}
        </div>}
        {Object.entries(receivedByCurrency).map(([currency, total]) => <p className="trip-currency-total" key={currency}>Received in {currency}: <b>{money(total, currency)}</b></p>)}</div>
        <div><h3>Supplier bills</h3>{!data.supplierBills.length ? <p className="trip-ledger-empty">No supplier bills recorded against this trip.</p> : <div className="trip-ledger-list">
          {data.supplierBills.map((bill) => {
            const paid = bill.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            const due = Math.max(0, Number(bill.amount || 0) - paid);
            return <div className="trip-ledger-row" key={bill.id}><span><b>{bill.supplier.name} · {bill.billNo}</b><small>{dateText(bill.billDate)} · {label(bill.status)} · Paid {money(paid, bill.currency)}</small></span><strong>{money(due, bill.currency)} due</strong></div>;
          })}
        </div>}</div>
      </div>
      <div className="trip-private-note"><CheckCircle2 size={15}/> Internal financial records are shown only to signed-in agency users. No supplier cost, bill, payment or margin is included in printable client documents.</div>
    </section>

    <div className="trip-footer-actions"><Link href="/packages">← Back to packages</Link><Link href="/finance">Open full receivables & payables register →</Link></div>
  </div>;
}
