"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, MessageSquareText, FileText, Package,
  Plane, Building2, Wallet, MapPinned, BarChart3, Settings, Menu, Bell, Search
} from "lucide-react";
import { useEffect, useState } from "react";

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

type Profile = { name: string; role: string; companyName: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.user) setProfile({
          name: data.user.name,
          role: data.user.role,
          companyName: data.company?.name || "Agency workspace",
        });
      })
      .catch(() => {});
  }, []);

  if (pathname === "/login" || pathname === "/setup") return <>{children}</>;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const initials = (profile?.name || "Team").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className="app-layout">
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <Link href="/" className="brand"><span className="brand-mark">✈</span><span>travel<span className="brand-light">desk</span><small>AGENCY MANAGEMENT</small></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">{(profile?.companyName || "A").slice(0, 1).toUpperCase()}</span><span><b>{profile?.companyName || "Agency workspace"}</b><small>Workspace</small></span><span className="chevron">⌄</span></div>
      {groups.map((group) => <div className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`nav-link ${active ? "active" : ""}`}><Icon size={18}/><span>{item.label}</span></Link>;
      })}</div>)}
      <div className="sidebar-bottom">
        <Link href="/settings" className={`nav-link ${pathname.startsWith("/settings") ? "active" : ""}`}><Settings size={18}/>Settings</Link>
        <div className="profile"><div className="profile-avatar">{initials}</div><div><b>{profile?.name || "Your account"}</b><small>{profile?.role || "Team member"}</small></div><button className="profile-dots" onClick={signOut} title="Sign out" aria-label="Sign out">↪</button></div>
      </div>
    </aside>
    {open && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{groups.flatMap((group) => group.items).find((item) => item.href === pathname)?.label || (pathname === "/" ? "Dashboard" : "Overview")}</b></div><div className="top-actions"><label className="top-search"><Search size={16}/><input placeholder="Search anything..."/></label><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19}/><i/></button><div className="top-avatar">{initials}</div></div></header>
      <div className="page-content">{children}</div>
      <footer className="footer">TravelDesk <span>•</span> {profile?.companyName || "Your agency"} workspace.</footer>
    </main>
  </div>;
}
