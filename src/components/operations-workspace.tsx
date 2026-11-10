"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Edit2, Plane, Plus, Search, Trash2, Users, X } from "lucide-react";

type Kind = "suppliers" | "bookings";
type Supplier = {
  id: string; name: string; category: string | null; contactName: string | null;
  email: string | null; phone: string | null; country: string | null; taxNumber: string | null;
  notes: string | null; isActive: boolean; _count?: { bookings: number; bills: number };
};
type PackageOption = { id: string; title: string; referenceNo: string; customer: { name: string } };
type Booking = {
  id: string; referenceNo: string; packageId: string; supplierId: string | null; serviceType: string;
  description: string; serviceDate: string | null; confirmationNo: string | null; status: string;
  supplierCost: string | number; costCurrency: string; costExchangeRate: string | number;
  travelPackage: PackageOption; supplier: { id: string; name: string } | null;
};
type FormState = Record<string, string>;
const supplierBlank: FormState = { name: "", category: "HOTEL", contactName: "", email: "", phone: "", country: "India", taxNumber: "", notes: "", isActive: "true" };
const bookingBlank: FormState = { packageId: "", supplierId: "", serviceType: "HOTEL", description: "", serviceDate: "", confirmationNo: "", status: "REQUESTED", supplierCost: "0", costCurrency: "INR", costExchangeRate: "1" };
const services = ["FLIGHT", "HOTEL", "TRANSFER", "ACTIVITY", "VISA", "CRUISE", "INSURANCE", "OTHER"];
const bookingStatuses = ["REQUESTED", "ON_HOLD", "CONFIRMED", "CANCELLED", "COMPLETED"];
const serviceLabel = (v: string) => v.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const dateInput = (v: string | null) => v ? new Date(v).toISOString().slice(0, 10) : "";

export function OperationsWorkspace({ kind }: { kind: Kind }) {
  const isSupplier = kind === "suppliers";
  const endpoint = isSupplier ? "/api/suppliers" : "/api/bookings";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [form, setForm] = useState<FormState>(isSupplier ? supplierBlank : bookingBlank);
  const [editing, setEditing] = useState<Supplier | Booking | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const responses = await Promise.all([
      fetch("/api/suppliers", { cache: "no-store" }),
      fetch("/api/bookings", { cache: "no-store" }),
      ...(!isSupplier ? [fetch("/api/packages", { cache: "no-store" })] : []),
    ]);
    const data = await Promise.all(responses.map((r) => r.json()));
    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].ok) throw new Error(data[i].error || "Could not load your agency records.");
    }
    setSuppliers(data[0].suppliers || []);
    setBookings(data[1].bookings || []);
    if (!isSupplier) setPackages(data[2].packages || []);
  }, [isSupplier]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Could not load records.")).finally(() => setLoading(false));
  }, [load]);

  const items = isSupplier ? suppliers : bookings;
  const filtered = useMemo(() => items.filter((item) => {
    const values = isSupplier
      ? [ (item as Supplier).name, (item as Supplier).category || "", (item as Supplier).contactName || "", (item as Supplier).email || "", (item as Supplier).phone || "" ]
      : [ (item as Booking).referenceNo, (item as Booking).description, (item as Booking).serviceType, (item as Booking).travelPackage?.title || "", (item as Booking).travelPackage?.customer?.name || "", (item as Booking).supplier?.name || "" ];
    return values.some((value) => value.toLowerCase().includes(query.toLowerCase()));
  }), [items, isSupplier, query]);

  function start(item?: Supplier | Booking) {
    setEditing(item || null);
    setError("");
    setNotice("");
    if (isSupplier) {
      const s = item as Supplier | undefined;
      setForm(s ? {
        name: s.name, category: s.category || "", contactName: s.contactName || "", email: s.email || "",
        phone: s.phone || "", country: s.country || "", taxNumber: s.taxNumber || "", notes: s.notes || "",
        isActive: String(s.isActive),
      } : { ...supplierBlank });
    } else {
      const b = item as Booking | undefined;
      setForm(b ? {
        packageId: b.packageId, supplierId: b.supplierId || "", serviceType: b.serviceType,
        description: b.description, serviceDate: dateInput(b.serviceDate), confirmationNo: b.confirmationNo || "",
        status: b.status, supplierCost: String(b.supplierCost ?? 0), costCurrency: b.costCurrency,
        costExchangeRate: String(b.costExchangeRate ?? 1),
      } : { ...bookingBlank });
    }
    setOpen(true);
  }
  function setField(key: string, value: string) { setForm((old) => ({ ...old, [key]: value })); }
  function close() { setOpen(false); setEditing(null); setError(""); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(editing ? endpoint + "/" + editing.id : endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isActive: form.isActive === "true" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this record.");
      close();
      setNotice(isSupplier ? (editing ? "Supplier updated successfully." : "Supplier added successfully.") : (editing ? "Booking updated successfully." : "Booking added successfully."));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this record.");
    } finally { setBusy(false); }
  }

  async function remove(item: Supplier | Booking) {
    const name = isSupplier ? (item as Supplier).name : (item as Booking).referenceNo;
    if (!window.confirm("Delete " + name + "? This cannot be undone.")) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(endpoint + "/" + item.id, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this record.");
      setNotice(isSupplier ? "Supplier deleted." : "Booking deleted.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete this record."); }
  }

  const activeSuppliers = suppliers.filter((s) => s.isActive).length;
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pendingBookings = bookings.filter((b) => ["REQUESTED", "ON_HOLD"].includes(b.status)).length;

  return <>
    <div className="page-heading">
      <div><div className="eyebrow">TRAVEL OPERATIONS</div><h1>{isSupplier ? "Suppliers" : "Bookings"}</h1><p>{isSupplier ? "Keep hotels, transport partners, DMCs and service providers in one directory." : "Record service reservations against each customer travel package."}</p></div>
      <button className="button button-primary" onClick={() => start()} disabled={!isSupplier && packages.length === 0} title={!isSupplier && packages.length === 0 ? "Create a travel package before adding a booking." : undefined}><Plus size={17}/>{isSupplier ? "Add supplier" : "Add booking"}</button>
    </div>
    <section className="stats-grid workflow-stats">
      <article className="stat-card"><div className="stat-top"><span>{isSupplier ? "Total suppliers" : "Total bookings"}</span><span className="stat-icon blue">{isSupplier ? <Building2 size={18}/> : <Plane size={18}/>}</span></div><strong>{items.length}</strong><small>Saved in your agency</small></article>
      <article className="stat-card"><div className="stat-top"><span>{isSupplier ? "Active suppliers" : "Awaiting confirmation"}</span><span className="stat-icon purple">{isSupplier ? <Users size={18}/> : <CalendarDays size={18}/>}</span></div><strong>{isSupplier ? activeSuppliers : pendingBookings}</strong><small>{isSupplier ? "Available for new bookings" : "Requested or on hold"}</small></article>
      <article className="stat-card"><div className="stat-top"><span>{isSupplier ? "Supplier-linked bookings" : "Confirmed bookings"}</span></div><strong>{isSupplier ? bookings.filter((b) => Boolean(b.supplierId)).length : confirmedBookings}</strong><small>{isSupplier ? "Across your agency packages" : "Confirmed by the supplier"}</small></article>
    </section>
    {notice && <div className="workflow-notice">{notice}</div>}
    {error && !open && <div className="form-error workflow-error">{error}</div>}
    <section className="panel section-list workflow-list">
      <div className="list-toolbar"><div><h2>{isSupplier ? "Supplier directory" : "Booking register"}</h2><p>{isSupplier ? "Search, edit and deactivate supplier records." : "Search and manage reservations across your travel packages."}</p></div><label className="list-search"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isSupplier ? "Search suppliers or contacts" : "Search booking, package or customer"}/></label></div>
      {loading ? <div className="workflow-empty">Loading your agency records…</div> :
        !isSupplier && packages.length === 0 ? <div className="workflow-empty"><Plane size={28}/><b>Create a travel package first</b><p>Each booking must belong to a customer travel package.</p></div> :
        filtered.length === 0 ? <div className="workflow-empty">{isSupplier ? <Building2 size={28}/> : <Plane size={28}/>}<b>{query ? "No matching records" : isSupplier ? "No suppliers yet" : "No bookings yet"}</b><p>{query ? "Try another search." : isSupplier ? "Add hotels, airlines, transport providers and other partners." : "Add a flight, hotel, transfer, activity, visa or other service."}</p><button className="button button-primary" onClick={() => start()}><Plus size={15}/> {isSupplier ? "Add first supplier" : "Add first booking"}</button></div> :
        <div className="table-wrap"><table><thead><tr>{isSupplier ? <><th>SUPPLIER</th><th>CONTACT</th><th>RECORDS</th><th>STATUS</th></> : <><th>BOOKING</th><th>PACKAGE / CUSTOMER</th><th>SERVICE DATE</th><th>SUPPLIER</th><th>STATUS</th></>}<th>ACTIONS</th></tr></thead><tbody>
          {filtered.map((item) => isSupplier ? (() => { const s = item as Supplier; return <tr key={s.id}><td><b>{s.name}</b><small>{s.category || "General supplier"}{s.contactName ? " · " + s.contactName : ""}</small></td><td>{s.email || "—"}<small>{s.phone || ""}</small></td><td>{s._count?.bookings || 0} bookings · {s._count?.bills || 0} bills</td><td><span className={"status " + (s.isActive ? "status-green" : "status-gray")}>{s.isActive ? "Active" : "Inactive"}</span></td><td><div className="workflow-actions"><button className="icon-button" title="Edit supplier" onClick={() => start(s)}><Edit2 size={15}/></button><button className="icon-button danger-icon" title="Delete supplier" onClick={() => remove(s)}><Trash2 size={15}/></button></div></td></tr>; })() : (() => { const b = item as Booking; const color = ["CONFIRMED", "COMPLETED"].includes(b.status) ? "green" : ["CANCELLED"].includes(b.status) ? "gray" : "amber"; return <tr key={b.id}><td><b>{serviceLabel(b.serviceType)} · {b.description}</b><small>{b.referenceNo}{b.confirmationNo ? " · " + b.confirmationNo : ""}</small></td><td><b>{b.travelPackage?.title || "Travel package"}</b><small>{b.travelPackage?.customer?.name || ""}</small></td><td>{b.serviceDate ? new Date(b.serviceDate).toLocaleDateString("en-IN") : "—"}</td><td>{b.supplier?.name || "Not assigned"}</td><td><span className={"status status-" + color}>{serviceLabel(b.status)}</span></td><td><div className="workflow-actions"><button className="icon-button" title="Edit booking" onClick={() => start(b)}><Edit2 size={15}/></button><button className="icon-button danger-icon" title="Delete booking" onClick={() => remove(b)}><Trash2 size={15}/></button></div></td></tr>; })())}
        </tbody></table></div>}
      <div className="list-footer">Live database records <span>{filtered.length} shown</span></div>
    </section>

    {open && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <form className="customer-modal workflow-modal" onSubmit={save}>
        <div className="modal-heading"><div><h2>{editing ? "Edit " : "Add "}{isSupplier ? "supplier" : "booking"}</h2><p>Saved records are private to your agency.</p></div><button type="button" className="icon-button" onClick={close}><X size={20}/></button></div>
        {error && <div className="form-error">{error}</div>}
        <div className="customer-form-grid">
          {isSupplier ? <>
            <label>Supplier name *<input required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. ABC Hotels"/></label>
            <label>Category<select value={form.category} onChange={(e) => setField("category", e.target.value)}>{["HOTEL","AIRLINE","TRANSPORT","DMC","TOUR_OPERATOR","INSURANCE","VISA","CRUISE","OTHER"].map((v) => <option key={v} value={v}>{serviceLabel(v)}</option>)}</select></label>
            <label>Contact person<input value={form.contactName} onChange={(e) => setField("contactName", e.target.value)}/></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}/></label>
            <label>Phone / WhatsApp<input value={form.phone} onChange={(e) => setField("phone", e.target.value)}/></label>
            <label>Country<input value={form.country} onChange={(e) => setField("country", e.target.value)}/></label>
            <label>Tax / GST number<input value={form.taxNumber} onChange={(e) => setField("taxNumber", e.target.value)}/></label>
            <label>Status<select value={form.isActive} onChange={(e) => setField("isActive", e.target.value)}><option value="true">Active</option><option value="false">Inactive</option></select></label>
            <label className="wide-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)}/></label>
          </> : <>
            <label>Travel package *<select required value={form.packageId} onChange={(e) => setField("packageId", e.target.value)}><option value="">Select a package</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.referenceNo} · {p.title} · {p.customer.name}</option>)}</select></label>
            <label>Supplier<select value={form.supplierId} onChange={(e) => setField("supplierId", e.target.value)}><option value="">Not assigned</option>{suppliers.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>Service type<select value={form.serviceType} onChange={(e) => setField("serviceType", e.target.value)}>{services.map((v) => <option key={v} value={v}>{serviceLabel(v)}</option>)}</select></label>
            <label>Description *<input required value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="e.g. Return flight Delhi to Singapore"/></label>
            <label>Service date<input type="date" value={form.serviceDate} onChange={(e) => setField("serviceDate", e.target.value)}/></label>
            <label>Confirmation number<input value={form.confirmationNo} onChange={(e) => setField("confirmationNo", e.target.value)}/></label>
            <label>Status<select value={form.status} onChange={(e) => setField("status", e.target.value)}>{bookingStatuses.map((v) => <option key={v} value={v}>{serviceLabel(v)}</option>)}</select></label>
            <label>Supplier cost<input type="number" min="0" step="0.01" value={form.supplierCost} onChange={(e) => setField("supplierCost", e.target.value)}/></label>
            <label>Cost currency<input maxLength={3} value={form.costCurrency} onChange={(e) => setField("costCurrency", e.target.value.toUpperCase())}/></label>
            <label>Exchange rate<input type="number" min="0.00000001" step="0.00000001" value={form.costExchangeRate} onChange={(e) => setField("costExchangeRate", e.target.value)}/></label>
          </>}
        </div>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : isSupplier ? "Save supplier" : "Save booking"}</button></div>
      </form>
    </div>}
  </>;
}
