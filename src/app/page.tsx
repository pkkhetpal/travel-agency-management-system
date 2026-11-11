import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign,
  ClipboardList, FileText, Plane, Plus, TrendingUp, Users, Building2,
} from "lucide-react";
import { requirePageSession } from "@/lib/page-auth";
import { DashboardRefresh } from "@/components/dashboard-refresh";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(value);
}

export default async function Dashboard() {
  const session = await requirePageSession();
  const now = new Date();
  const companyId = session.companyId;

  const [
    customerCount,
    openEnquiries,
    sentQuotations,
    activePackages,
    pendingBookings,
    openSupplierBills,
    upcomingPackages,
  ] = await Promise.all([
    prisma.customer.count({ where: { companyId } }),
    prisma.enquiry.count({
      where: { companyId, status: { notIn: ["CONVERTED", "LOST"] } },
    }),
    prisma.quotation.count({
      where: { companyId, status: "SENT" },
    }),
    prisma.travelPackage.count({
      where: { companyId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
    }),
    prisma.booking.count({
      where: {
        travelPackage: { companyId },
        status: { in: ["REQUESTED", "ON_HOLD"] },
      },
    }),
    prisma.supplierBill.count({
      where: { companyId, status: { in: ["OPEN", "PARTIALLY_PAID"] } },
    }),
    prisma.travelPackage.findMany({
      where: {
        companyId,
        travelStart: { gte: now },
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { travelStart: "asc" },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Customers", value: customerCount, note: "Saved in your agency", icon: Users, tone: "blue", href: "/customers" },
    { label: "Open enquiries", value: openEnquiries, note: "Not converted or closed", icon: ClipboardList, tone: "amber", href: "/enquiries" },
    { label: "Sent quotations", value: sentQuotations, note: "Waiting for a decision", icon: FileText, tone: "purple", href: "/quotations" },
    { label: "Active packages", value: activePackages, note: "Confirmed or in progress", icon: Plane, tone: "green", href: "/packages" },
    { label: "Pending bookings", value: pendingBookings, note: "Requested or on hold", icon: CalendarDays, tone: "amber", href: "/bookings" },
    { label: "Open supplier bills", value: openSupplierBills, note: "Awaiting full payment", icon: CircleDollarSign, tone: "purple", href: "/finance" },
  ];

  return <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">YOUR AGENCY WORKSPACE</div>
        <h1>Welcome back, {session.name} <span>✦</span></h1>
        <p>Here is the current activity recorded for your agency.</p>
      </div>
      <div className="heading-actions">
        <DashboardRefresh />
        <Link className="button button-primary" href="/enquiries"><Plus size={17}/> New enquiry</Link>
      </div>
    </div>

    <section className="stats-grid" aria-label="Live agency totals">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return <Link className="stat-card stat-card-link" href={stat.href} key={stat.label}>
          <div className="stat-top">
            <span>{stat.label}</span>
            <span className={`stat-icon ${stat.tone}`}><Icon size={18}/></span>
          </div>
          <strong>{stat.value.toLocaleString("en-IN")}</strong>
          <small>{stat.note}</small>
        </Link>;
      })}
    </section>

    <div className="dashboard-grid">
      <section className="panel trips-panel">
        <div className="panel-heading">
          <div><h2>Upcoming confirmed trips</h2><p>Next departures for confirmed and in-progress packages.</p></div>
          <Link href="/packages" className="text-link">View all <ArrowRight size={15}/></Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>PACKAGE</th><th>CUSTOMER</th><th>DEPARTURE</th><th>TRAVELLERS</th><th>STATUS</th></tr></thead>
            <tbody>
              {upcomingPackages.length ? upcomingPackages.map((pkg) => (
                <tr key={pkg.id}>
                  <td><b>{pkg.title}</b><small>{pkg.referenceNo}</small></td>
                  <td>{pkg.customer.name}</td>
                  <td>{formatDate(pkg.travelStart)}</td>
                  <td>{pkg.adults + pkg.children}</td>
                  <td><span className="status status-blue">{pkg.status.replaceAll("_", " ")}</span></td>
                </tr>
              )) : <tr><td colSpan={5} className="empty-cell">No upcoming confirmed trips yet. Confirm a package with a future departure date to see it here.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel actions-panel">
        <div className="panel-heading"><div><h2>Quick actions</h2><p>Open a workspace section.</p></div></div>
        <div className="quick-actions">
          <Link href="/enquiries"><span className="quick-icon blue"><ClipboardList/></span><span><b>Create enquiry</b><small>Record a customer request</small></span><ArrowUpRight/></Link>
          <Link href="/packages"><span className="quick-icon green"><Plane/></span><span><b>View packages</b><small>Manage trip details</small></span><ArrowUpRight/></Link>
          <Link href="/customers"><span className="quick-icon purple"><Users/></span><span><b>Manage customers</b><small>Open your customer directory</small></span><ArrowUpRight/></Link>
          <Link href="/suppliers"><span className="quick-icon amber"><Building2/></span><span><b>Manage suppliers</b><small>View your service partners</small></span><ArrowUpRight/></Link>
        </div>
      </section>
    </div>

    <section className="bottom-grid">
      <article className="panel mini-panel">
        <div className="mini-icon"><CalendarDays/></div>
        <div><b>Travel calendar</b><p>Review travel dates recorded against packages.</p><Link href="/itineraries">Open itineraries <ArrowRight size={14}/></Link></div>
      </article>
      <article className="panel mini-panel">
        <div className="mini-icon"><TrendingUp/></div>
        <div><b>Business reports</b><p>Review totals calculated from your agency records.</p><Link href="/reports">View reports <ArrowRight size={14}/></Link></div>
      </article>
    </section>
    <p className="demo-note">Live workspace · Counts are refreshed from your agency database whenever this page loads. Select a count to open its records.</p>
  </>;
}
