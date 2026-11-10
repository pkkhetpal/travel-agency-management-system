import Link from "next/link";
import { ArrowUpRight, ArrowRight, CalendarDays, CircleDollarSign, ClipboardList, Plane, Plus, TrendingUp, Users } from "lucide-react";

const stats = [
  {label:"Confirmed packages",value:"24",change:"+12% this month",icon:Plane,tone:"blue"},
  {label:"Enquiries to follow up",value:"08",change:"3 due today",icon:ClipboardList,tone:"amber"},
  {label:"Customer receivables",value:"₹4,82,500",change:"Across 11 packages",icon:CircleDollarSign,tone:"green"},
  {label:"Supplier payables",value:"₹2,16,800",change:"5 bills pending",icon:TrendingUp,tone:"purple"}
];
const trips = [
  {id:"PKG-2026-0042",name:"Bali Family Escape",customer:"Aarav Mehta",date:"14 Nov 2026",guests:"4 guests",status:"Confirmed",tone:"green"},
  {id:"PKG-2026-0041",name:"Dubai Honeymoon",customer:"Riya Shah",date:"18 Nov 2026",guests:"2 guests",status:"In progress",tone:"blue"},
  {id:"PKG-2026-0039",name:"Kerala Backwaters",customer:"Kunal Verma",date:"22 Nov 2026",guests:"6 guests",status:"Pending",tone:"amber"},
  {id:"PKG-2026-0038",name:"Singapore Highlights",customer:"Neha Kapoor",date:"26 Nov 2026",guests:"3 guests",status:"Confirmed",tone:"green"}
];
export default function Dashboard() {
 return <><div className="page-heading"><div><div className="eyebrow">MONDAY, 10 NOVEMBER 2026</div><h1>Good morning, Admin <span>✦</span></h1><p>Here’s what’s happening with your travel business today.</p></div><Link className="button button-primary" href="/enquiries"><Plus size={17}/> New enquiry</Link></div>
 <section className="stats-grid">{stats.map(s=>{const Icon=s.icon;return <article className="stat-card" key={s.label}><div className="stat-top"><span>{s.label}</span><span className={`stat-icon ${s.tone}`}><Icon size={18}/></span></div><strong>{s.value}</strong><small>{s.change}</small></article>})}</section>
 <div className="dashboard-grid"><section className="panel trips-panel"><div className="panel-heading"><div><h2>Upcoming packages</h2><p>Keep an eye on your next departures.</p></div><Link href="/packages" className="text-link">View all <ArrowRight size={15}/></Link></div><div className="table-wrap"><table><thead><tr><th>PACKAGE</th><th>CUSTOMER</th><th>DEPARTURE</th><th>GUESTS</th><th>STATUS</th></tr></thead><tbody>{trips.map(t=><tr key={t.id}><td><b>{t.name}</b><small>{t.id}</small></td><td>{t.customer}</td><td>{t.date}</td><td>{t.guests}</td><td><span className={`status status-${t.tone}`}>{t.status}</span></td></tr>)}</tbody></table></div></section>
 <section className="panel actions-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Get things moving.</p></div></div><div className="quick-actions"><Link href="/enquiries"><span className="quick-icon blue"><ClipboardList/></span><span><b>Create enquiry</b><small>Start with a new customer request</small></span><ArrowUpRight/></Link><Link href="/packages"><span className="quick-icon green"><Plane/></span><span><b>New package</b><small>Set up a confirmed trip</small></span><ArrowUpRight/></Link><Link href="/customers"><span className="quick-icon purple"><Users/></span><span><b>Add customer</b><small>Save customer details</small></span><ArrowUpRight/></Link><Link href="/finance"><span className="quick-icon amber"><CircleDollarSign/></span><span><b>Record payment</b><small>Update a customer receipt</small></span><ArrowUpRight/></Link></div></section></div>
 <section className="bottom-grid"><article className="panel mini-panel"><div className="mini-icon"><CalendarDays/></div><div><b>Travel calendar</b><p>See upcoming departures and trip dates.</p><Link href="/itineraries">Open calendar <ArrowRight size={14}/></Link></div></article><article className="panel mini-panel"><div className="mini-icon"><TrendingUp/></div><div><b>Business snapshot</b><p>Review collections, supplier costs and package margins.</p><Link href="/reports">View reports <ArrowRight size={14}/></Link></div></article></section>
 <p className="demo-note">Demo workspace · Sample figures and customer names are illustrative, not live business records.</p></>;
}
