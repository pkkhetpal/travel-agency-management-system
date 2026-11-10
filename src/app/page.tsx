import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, ClipboardList, Plane, Plus, TrendingUp, Users, Building2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(value);
}

export default async function Dashboard() {
  const session = await requireSession();
  const now = new Date();

  const [customerCount, openEnquiries, activePackages, openSupplierBills, upcomingPackages] = await Promise.all([
    prisma.customer.count({ where: { companyId: session.companyId } }),
    prisma.enquiry.count({
      where: { companyId: session.companyId, status: { notIn: ["CONVERTED", "LOST"] } },
    }),
    prisma.travelPackage.count({
      where: { companyId: session.companyId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
    }),
    prisma.supplierBill.count({
      where: { companyId: session.companyId, status: { in: ["OPEN", "PARTIALLY_PAID"] } },
    }),
    prisma.travelPackage.findMany({
      where: { companyId: session.companyId, travelStart: { gte: now } },
      include: { customer: { select: { name: true } } },
      orderBy: { travelStart: "asc" },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Customers", value: customerCount, note: "Saved in your agency", icon: Users, tone: "blue" },
    { label: "Open enquiries", value: openEnquiries, note: "Not yet converted or closed", icon: ClipboardList, tone: "amber" },
    { label: "Active packages", value: activePackages, note: "Confirmed or in progress", icon: Plane, tone: "green" },
    { label: "Open supplier bills", value: openSupplierBills, note: "Awaiting full payment", icon: CircleDollarSign, tone: "purple" },
  ];

  return <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">YOUR AGENCY WORKSPACE</div>
        <h1>Welcome back, {session.name} <span>✦</span></h1>
        <p>Here is the current activity recorded for your agency.</p>
      </div>
      <Link className="button button-primary" href="/enquiries"><Plus size={17}/> New enquiry</Link>
    </div>

    <section className="stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return <article className="stat-card" key={stat.label}>
          <div className="stat-top">
            <span>{stat.label}</span>
            <span className={`stat-icon ${stat.tone}`}><Icon size={18}/></span>
          </div>
          <strong>{stat.value.toLocaleString("en-IN")}</strong>
          <small>{stat.note}</small>
        </article>;
      })}
    </section>

    <div className="dashboard-grid">
      <section className="panel trips-panel">
        <div className="panel-heading">
          <div><h2>Upcoming packages</h2><p>Packages with future travel dates in your database.</p></div>
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
              )) : <tr><td colSpan={5} className="empty-cell">No upcoming packages yet. Create a package to see departures here.</td></tr>}
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
    <p className="demo-note">Live workspace · Counts above are read from your agency database. Empty sections mean no records have been entered yet.</p>
  </>;
}
