"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, MessageSquareText, FileText, Package,
  Plane, Building2, Wallet, MapPinned, BarChart3, Settings, Menu, Bell, Search
} from "lucide-react";
import { useState } from "react";

const groups = [
  { title: "WORKSPACE", items: [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Enquiries", href: "/enquiries", icon: MessageSquareText },
    { label: "Quotations", href: "/quotations", icon: FileText },
    { label: "Packages", href: "/packages", icon: Package },
  ]},
  { title: "TRAVEL OPERATIONS", items: [
    { label: "Customers & Guests", href: "/customers", icon: Users },
    { label: "Bookings", href: "/bookings", icon: Plane },
    { label: "Suppliers", href: "/suppliers", icon: Building2 },
    { label: "Itineraries", href: "/itineraries", icon: MapPinned },
  ]},
  { title: "FINANCE & INSIGHTS", items: [
    { label: "Receivables & Payables", href: "/finance", icon: Wallet },
    { label: "Reports", href: "/reports", icon: BarChart3 },
  ]}
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="app-layout">
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <Link href="/" className="brand"><span className="brand-mark">✈</span><span>travel<span className="brand-light">desk</span><small>AGENCY MANAGEMENT</small></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">T</span><span><b>Travel Agency</b><small>Workspace</small></span><span className="chevron">⌄</span></div>
      {groups.map(group => <div className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map(item => {
        const Icon = item.icon; const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`nav-link ${active ? "active" : ""}`}><Icon size={18}/><span>{item.label}</span></Link>;
      })}</div>)}
      <div className="sidebar-bottom"><Link href="/settings" className={`nav-link ${pathname.startsWith("/settings") ? "active" : ""}`}><Settings size={18}/>Settings</Link><div className="profile"><div className="profile-avatar">AD</div><div><b>Agency Admin</b><small>Administrator</small></div><span className="profile-dots">•••</span></div></div>
    </aside>
    {open && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{groups.flatMap(g=>g.items).find(i=>i.href===pathname)?.label || (pathname==="/" ? "Dashboard" : "Overview")}</b></div><div className="top-actions"><label className="top-search"><Search size={16}/><input placeholder="Search anything..."/></label><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19}/><i/></button><div className="top-avatar">AD</div></div></header>
      <div className="page-content">{children}</div>
      <footer className="footer">TravelDesk <span>•</span> Travel operations, made simpler.</footer>
    </main>
  </div>;
}
