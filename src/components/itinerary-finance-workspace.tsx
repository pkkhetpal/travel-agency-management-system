"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Edit2, FileText, Plus, Receipt, Search, Trash2, Wallet, X } from "lucide-react";

type PackageOption = { id: string; title: string; referenceNo: string; customer: { name: string }; saleAmount?: string | number; currency?: string; travelStart?: string | null; travelEnd?: string | null };
type SupplierOption = { id: string; name: string };
type ItineraryDay = { id: string; packageId: string; dayNumber: number; date: string | null; title: string; description: string | null; hotel: string | null; meals: string | null; travelPackage: PackageOption };
type ReceiptItem = { id: string; receiptNo: string; receivedAt: string; amount: string | number; currency: string; method: string; reference: string | null; status: string; notes: string | null; travelPackage: PackageOption };
type BillItem = { id: string; billNo: string; supplierInvoiceNo: string | null; billDate: string; dueDate: string | null; amount: string | number; taxAmount: string | number; currency: string; status: string; notes: string | null; supplier: SupplierOption; travelPackage: PackageOption; payments: { amount: string | number; payment: { paymentNo: string; currency: string } }[] };
type PaymentItem = { id: string; paymentNo: string; paidAt: string; amount: string | number; currency: string; method: string; reference: string | null; notes: string | null; allocations: { amount: string | number; bill: { id: string; billNo: string; supplier: SupplierOption; travelPackage: { title: string } } }[] };
type FormState = Record<string, string>;
const methods = ["CASH", "BANK_TRANSFER", "UPI", "CARD", "PAYMENT_LINK", "OTHER"];
const methodLabel = (v: string) => v.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const dateText = (v: string | null | undefined) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dateValue = (v: string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : "";
const moneyText = (v: unknown, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(v || 0));

export function ItineraryWorkspace() {
  const blank: FormState = { packageId: "", dayNumber: "1", date: "", title: "", description: "", hotel: "", meals: "" };
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [form, setForm] = useState<FormState>(blank);
  const [editing, setEditing] = useState<ItineraryDay | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/itineraries", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load itineraries.");
    setDays(data.days || []); setPackages(data.packages || []);
  }, []);
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Could not load itineraries.")).finally(() => setLoading(false)); }, [load]);
  const filtered = useMemo(() => days.filter((d) => [d.title, d.description || "", d.travelPackage.title, d.travelPackage.customer.name, d.travelPackage.referenceNo].some((v) => v.toLowerCase().includes(query.toLowerCase()))), [days, query]);

  function start(day?: ItineraryDay) {
    setEditing(day || null); setError(""); setNotice("");
    setForm(day ? { packageId: day.packageId, dayNumber: String(day.dayNumber), date: dateValue(day.date), title: day.title, description: day.description || "", hotel: day.hotel || "", meals: day.meals || "" } : { ...blank });
    setOpen(true);
  }
  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function close() { setOpen(false); setEditing(null); setError(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(editing ? "/api/itineraries/" + editing.id : "/api/itineraries", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save itinerary day.");
      close(); setNotice(editing ? "Itinerary day updated." : "Itinerary day saved."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save itinerary day."); }
    finally { setBusy(false); }
  }
  async function remove(day: ItineraryDay) {
    if (!window.confirm("Delete Day " + day.dayNumber + " – " + day.title + "?")) return;
    try {
      const response = await fetch("/api/itineraries/" + day.id, { method: "DELETE" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete itinerary day.");
      setNotice("Itinerary day deleted."); setError(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete itinerary day."); }
  }
  return <>
    <div className="page-heading"><div><div className="eyebrow">TRAVEL OPERATIONS</div><h1>Itineraries</h1><p>Build day-wise plans with dates, activities, accommodation and meal details.</p></div><button className="button button-primary" onClick={() => start()} disabled={!packages.length} title={!packages.length ? "Create a travel package first." : undefined}><Plus size={17}/> Add itinerary day</button></div>
    <section className="stats-grid workflow-stats">
      <article className="stat-card"><div className="stat-top"><span>Itinerary days</span><span className="stat-icon blue"><CalendarDays size={18}/></span></div><strong>{days.length}</strong><small>Saved across packages</small></article>
      <article className="stat-card"><div className="stat-top"><span>Packages with plans</span></div><strong>{new Set(days.map((d) => d.packageId)).size}</strong><small>Packages with at least one day</small></article>
      <article className="stat-card"><div className="stat-top"><span>Available packages</span></div><strong>{packages.length}</strong><small>Can receive itinerary days</small></article>
    </section>
    {notice && <div className="workflow-notice">{notice}</div>}{error && !open && <div className="form-error workflow-error">{error}</div>}
    <section className="panel section-list workflow-list"><div className="list-toolbar"><div><h2>Day-wise itinerary</h2><p>Each package can have one entry for each day number.</p></div><label className="list-search"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search package, customer or activity"/></label></div>
      {loading ? <div className="workflow-empty">Loading itinerary…</div> : !packages.length ? <div className="workflow-empty"><CalendarDays size={28}/><b>Create a travel package first</b><p>Itinerary days are attached to a package and its customer.</p></div> : !filtered.length ? <div className="workflow-empty"><CalendarDays size={28}/><b>{query ? "No matching itinerary days" : "No itinerary days yet"}</b><p>{query ? "Try another search." : "Start creating a day-wise plan for a customer package."}</p><button className="button button-primary" onClick={() => start()}><Plus size={15}/> Add first day</button></div> :
      <div className="table-wrap"><table><thead><tr><th>DAY / PLAN</th><th>PACKAGE / CUSTOMER</th><th>DATE</th><th>HOTEL / MEALS</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map((d) => <tr key={d.id}><td><b>Day {d.dayNumber} · {d.title}</b><small>{d.description || "No activity description"}</small></td><td><b>{d.travelPackage.title}</b><small>{d.travelPackage.referenceNo} · {d.travelPackage.customer.name}</small></td><td>{dateText(d.date)}</td><td>{[d.hotel, d.meals].filter(Boolean).join(" · ") || "—"}</td><td><div className="workflow-actions"><button className="icon-button" title="Edit itinerary day" onClick={() => start(d)}><Edit2 size={15}/></button><button className="icon-button danger-icon" title="Delete itinerary day" onClick={() => remove(d)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
      <div className="list-footer">Live database records <span>{filtered.length} shown</span></div>
    </section>
    {open && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><form className="customer-modal workflow-modal" onSubmit={save}>
      <div className="modal-heading"><div><h2>{editing ? "Edit itinerary day" : "Add itinerary day"}</h2><p>Save a day in a customer travel package.</p></div><button type="button" className="icon-button" onClick={close}><X size={20}/></button></div>{error && <div className="form-error">{error}</div>}
      <div className="customer-form-grid">
        <label className="wide-field">Travel package *<select required value={form.packageId} onChange={(e) => setField("packageId", e.target.value)}><option value="">Select a package</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.referenceNo} · {p.title} · {p.customer.name}</option>)}</select></label>
        <label>Day number *<input type="number" min="1" step="1" required value={form.dayNumber} onChange={(e) => setField("dayNumber", e.target.value)}/></label>
        <label>Date<input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)}/></label>
        <label className="wide-field">Day title *<input required value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Arrive in Singapore and city tour"/></label>
        <label className="wide-field">Activities / description<textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)}/></label>
        <label>Hotel / accommodation<input value={form.hotel} onChange={(e) => setField("hotel", e.target.value)}/></label>
        <label>Meals<input value={form.meals} onChange={(e) => setField("meals", e.target.value)} placeholder="e.g. Breakfast, dinner"/></label>
      </div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save itinerary day"}</button></div>
    </form></div>}
  </>;
}

type FinanceTab = "receipts" | "bills" | "payments";
const receiptBlank: FormState = { packageId: "", amount: "", currency: "INR", method: "BANK_TRANSFER", receivedAt: new Date().toISOString().slice(0, 10), reference: "", notes: "" };
const billBlank: FormState = { packageId: "", supplierId: "", supplierInvoiceNo: "", billDate: new Date().toISOString().slice(0, 10), dueDate: "", amount: "", taxAmount: "0", currency: "INR", notes: "" };
const paymentBlank: FormState = { amount: "", currency: "INR", method: "BANK_TRANSFER", paidAt: new Date().toISOString().slice(0, 10), reference: "", notes: "" };

export function FinanceWorkspace() {
  const [tab, setTab] = useState<FinanceTab>("receipts");
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [form, setForm] = useState<FormState>({ ...receiptBlank });
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r1, r2, r3] = await Promise.all([
      fetch("/api/finance/receipts", { cache: "no-store" }),
      fetch("/api/finance/supplier-bills", { cache: "no-store" }),
      fetch("/api/finance/supplier-payments", { cache: "no-store" }),
    ]);
    const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
    for (const [r, d] of [[r1,d1],[r2,d2],[r3,d3]] as const) if (!r.ok) throw new Error(d.error || "Could not load finance records.");
    setReceipts(d1.receipts || []); setPackages(d1.packages || d2.packages || []);
    setBills(d2.bills || []); setSuppliers(d2.suppliers || []);
    setPayments(d3.payments || []);
  }, []);
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Could not load finance records.")).finally(() => setLoading(false)); }, [load]);

  const openBills = useMemo(() => bills.filter((b) => b.status !== "VOID" && Number(b.payments.reduce((sum, p) => sum + Number(p.amount), 0)) < Number(b.amount) - 0.001), [bills]);
  const allocatedAmount = Object.values(allocations).reduce((sum, v) => sum + Math.max(0, Number(v || 0)), 0);
  const visibleRows = useMemo(() => {
    const values: { id: string; title: string; subtitle: string; detail: string; status: string; amount: string; extra: string }[] =
      tab === "receipts" ? receipts.map((r) => ({ id: r.id, title: r.travelPackage.customer.name + " · Customer receipt", subtitle: r.receiptNo + " · " + r.travelPackage.title, detail: dateText(r.receivedAt), status: r.status, amount: moneyText(r.amount, r.currency), extra: methodLabel(r.method) + (r.reference ? " · " + r.reference : "") })) :
      tab === "bills" ? bills.map((b) => ({ id: b.id, title: b.supplier.name + " · Supplier bill", subtitle: b.billNo + " · " + b.travelPackage.title, detail: "Due " + dateText(b.dueDate), status: b.status, amount: moneyText(b.amount, b.currency), extra: "Tax " + moneyText(b.taxAmount, b.currency) + (b.supplierInvoiceNo ? " · Invoice " + b.supplierInvoiceNo : "") })) :
      payments.map((p) => ({ id: p.id, title: p.paymentNo + " · Supplier payment", subtitle: p.allocations.map((a) => a.bill.supplier.name + " / " + a.bill.billNo).join(", ") || "Unallocated", detail: dateText(p.paidAt), status: p.allocations.length + " allocation(s)", amount: moneyText(p.amount, p.currency), extra: methodLabel(p.method) + (p.reference ? " · " + p.reference : "") }));
    return values.filter((r) => [r.title,r.subtitle,r.detail,r.status,r.extra].some((v) => v.toLowerCase().includes(query.toLowerCase())));
  }, [tab, receipts, bills, payments, query]);

  function start() {
    setError(""); setNotice(""); setAllocations({});
    setForm(tab === "receipts" ? { ...receiptBlank } : tab === "bills" ? { ...billBlank } : { ...paymentBlank });
    setOpen(true);
  }
  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function close() { setOpen(false); setError(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let path = tab === "receipts" ? "/api/finance/receipts" : tab === "bills" ? "/api/finance/supplier-bills" : "/api/finance/supplier-payments";
      const payload = tab === "payments" ? { ...form, allocations: Object.entries(allocations).filter(([,v]) => Number(v) > 0).map(([billId,v]) => ({ billId, amount: v })) } : form;
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save finance record.");
      close(); setNotice(tab === "receipts" ? "Customer receipt recorded." : tab === "bills" ? "Supplier bill recorded." : "Supplier payment and bill allocations recorded.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save finance record."); }
    finally { setBusy(false); }
  }

  async function voidRecord(type: "receipts" | "bills", id: string, reference: string) {
    if (!window.confirm("Void " + reference + "? This is a permanent accounting status change.")) return;
    const path = type === "receipts" ? "/api/finance/receipts/" : "/api/finance/supplier-bills/";
    try {
      const response = await fetch(path + id, { method: "PATCH" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not void this record.");
      setNotice(reference + " marked as void."); setError(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not void this record."); }
  }

  const totals = {
    receipts: receipts.filter((r) => r.status !== "VOID").length,
    bills: bills.filter((b) => b.status !== "VOID").length,
    payments: payments.length,
    openBillCount: openBills.length,
  };
  const title = tab === "receipts" ? "Customer receipts" : tab === "bills" ? "Supplier bills" : "Supplier payments";
  const canAdd = tab === "receipts" ? packages.length > 0 : tab === "bills" ? packages.length > 0 && suppliers.length > 0 : openBills.length > 0;

  return <>
    <div className="page-heading"><div><div className="eyebrow">FINANCE & INSIGHTS</div><h1>Receivables & Payables</h1><p>Record customer receipts, supplier bills and supplier payments with bill allocations.</p></div><button className="button button-primary" onClick={start} disabled={!canAdd} title={!canAdd ? "Create the required package, supplier or bill first." : undefined}><Plus size={17}/> Record {tab === "receipts" ? "receipt" : tab === "bills" ? "supplier bill" : "payment"}</button></div>
    <section className="stats-grid workflow-stats">
      <article className="stat-card"><div className="stat-top"><span>Receipts recorded</span><span className="stat-icon green"><Receipt size={18}/></span></div><strong>{totals.receipts}</strong><small>Active receipt records</small></article>
      <article className="stat-card"><div className="stat-top"><span>Supplier bills</span><span className="stat-icon amber"><FileText size={18}/></span></div><strong>{totals.bills}</strong><small>Active bill records</small></article>
      <article className="stat-card"><div className="stat-top"><span>Supplier payments</span><span className="stat-icon blue"><Wallet size={18}/></span></div><strong>{totals.payments}</strong><small>{totals.openBillCount} bills with balances</small></article>
    </section>
    <section className="panel section-list workflow-list">
      <div className="list-toolbar"><div><h2>{title}</h2><p>Financial entries saved in your agency database.</p></div><label className="list-search"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reference, package or supplier"/></label></div>
      <div className="finance-tabs">{(["receipts","bills","payments"] as FinanceTab[]).map((v) => <button key={v} className={"finance-tab " + (tab === v ? "active" : "")} onClick={() => { setTab(v); setQuery(""); setError(""); setNotice(""); setOpen(false); }}>{v === "receipts" ? "Customer receipts" : v === "bills" ? "Supplier bills" : "Supplier payments"}</button>)}</div>
      {notice && <div className="workflow-notice">{notice}</div>}{error && <div className="form-error workflow-error">{error}</div>}
      {loading ? <div className="workflow-empty">Loading finance records…</div> : !visibleRows.length ? <div className="workflow-empty"><Wallet size={28}/><b>{query ? "No matching records" : "No " + title.toLowerCase() + " yet"}</b><p>{query ? "Try another search." : tab === "receipts" ? "Record each amount received against a customer package. Multiple receipts per package are supported." : tab === "bills" ? "Enter a supplier invoice against a package to track the amount owed." : "Record a supplier payment and allocate it to one or more bills."}</p>{canAdd && <button className="button button-primary" onClick={start}><Plus size={15}/> Record first entry</button>}</div> :
      <div className="table-wrap"><table><thead><tr><th>PARTY / REFERENCE</th><th>DATE / DUE</th><th>AMOUNT</th><th>DETAILS</th><th>STATUS</th>{tab !== "payments" && <th>ACTIONS</th>}</tr></thead><tbody>
        {visibleRows.map((r) => <tr key={r.id}><td><b>{r.title}</b><small>{r.subtitle}</small></td><td>{r.detail}</td><td><b>{r.amount}</b></td><td>{r.extra}</td><td><span className={"status " + (r.status === "PAID" ? "status-green" : r.status === "VOID" ? "status-gray" : r.status === "OPEN" || r.status === "PARTIALLY_PAID" ? "status-amber" : "status-blue")}>{r.status.replaceAll("_"," ")}</span></td>{tab !== "payments" && <td><button className="button button-secondary finance-void" disabled={r.status === "VOID" || (tab === "bills" && r.status === "PAID")} onClick={() => voidRecord(tab, r.id, r.subtitle.split(" · ")[0])}>Void</button></td>}</tr>)}
      </tbody></table></div>}
      <div className="list-footer">Live finance records <span>{visibleRows.length} shown</span></div>
    </section>

    {open && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><form className="customer-modal workflow-modal" onSubmit={save}>
      <div className="modal-heading"><div><h2>Record {tab === "receipts" ? "customer receipt" : tab === "bills" ? "supplier bill" : "supplier payment"}</h2><p>{tab === "payments" ? "Allocate the payment across one or more supplier bills." : "This entry is saved to your agency finance records."}</p></div><button type="button" className="icon-button" onClick={close}><X size={20}/></button></div>
      {error && <div className="form-error">{error}</div>}
      <div className="customer-form-grid">
        {tab === "receipts" && <>
          <label className="wide-field">Customer package *<select required value={form.packageId} onChange={(e) => { setField("packageId",e.target.value); const p=packages.find((x)=>x.id===e.target.value); if(p?.currency) setField("currency",p.currency); }}><option value="">Select a package</option>{packages.map((p)=><option key={p.id} value={p.id}>{p.referenceNo} · {p.title} · {p.customer.name}</option>)}</select></label>
          <label>Amount received *<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e)=>setField("amount",e.target.value)}/></label>
          <label>Currency<input maxLength={3} value={form.currency} onChange={(e)=>setField("currency",e.target.value.toUpperCase())}/></label>
          <label>Received on<input type="date" value={form.receivedAt} onChange={(e)=>setField("receivedAt",e.target.value)}/></label>
          <label>Payment method<select value={form.method} onChange={(e)=>setField("method",e.target.value)}>{methods.map((m)=><option key={m} value={m}>{methodLabel(m)}</option>)}</select></label>
          <label className="wide-field">Bank / UPI reference<input value={form.reference} onChange={(e)=>setField("reference",e.target.value)}/></label>
          <label className="wide-field">Notes<textarea rows={2} value={form.notes} onChange={(e)=>setField("notes",e.target.value)}/></label>
        </>}
        {tab === "bills" && <>
          <label className="wide-field">Travel package *<select required value={form.packageId} onChange={(e)=>setField("packageId",e.target.value)}><option value="">Select a package</option>{packages.map((p)=><option key={p.id} value={p.id}>{p.referenceNo} · {p.title} · {p.customer.name}</option>)}</select></label>
          <label>Supplier *</label><select required value={form.supplierId} onChange={(e)=>setField("supplierId",e.target.value)}><option value="">Select supplier</option>{suppliers.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <label>Supplier invoice no.<input value={form.supplierInvoiceNo} onChange={(e)=>setField("supplierInvoiceNo",e.target.value)}/></label>
          <label>Bill date *<input type="date" required value={form.billDate} onChange={(e)=>setField("billDate",e.target.value)}/></label>
          <label>Due date<input type="date" value={form.dueDate} onChange={(e)=>setField("dueDate",e.target.value)}/></label>
          <label>Bill total *<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e)=>setField("amount",e.target.value)}/></label>
          <label>Tax amount<input type="number" min="0" step="0.01" value={form.taxAmount} onChange={(e)=>setField("taxAmount",e.target.value)}/></label>
          <label>Currency<input maxLength={3} value={form.currency} onChange={(e)=>setField("currency",e.target.value.toUpperCase())}/></label>
          <label className="wide-field">Notes<textarea rows={2} value={form.notes} onChange={(e)=>setField("notes",e.target.value)}/></label>
        </>}
        {tab === "payments" && <>
          <label>Payment date<input type="date" value={form.paidAt} onChange={(e)=>setField("paidAt",e.target.value)}/></label>
          <label>Currency<input maxLength={3} value={form.currency} onChange={(e)=>{ setField("currency",e.target.value.toUpperCase()); setAllocations({}); }}/></label>
          <label>Payment amount *<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e)=>setField("amount",e.target.value)}/></label>
          <label>Payment method<select value={form.method} onChange={(e)=>setField("method",e.target.value)}>{methods.map((m)=><option key={m} value={m}>{methodLabel(m)}</option>)}</select></label>
          <label className="wide-field">Reference<input value={form.reference} onChange={(e)=>setField("reference",e.target.value)}/></label>
          <div className="wide-field finance-allocation-list"><b>Allocate to supplier bills</b><small>Only unpaid balances in the selected currency are shown. Remaining balance on a bill is calculated from earlier payments.</small>
            {openBills.filter((b)=>b.currency===form.currency).map((b)=>{
              const paid=b.payments.reduce((s,p)=>s+Number(p.amount),0); const remaining=Math.max(0,Number(b.amount)-paid);
              return <label key={b.id} className="allocation-row"><span><b>{b.supplier.name} · {b.billNo}</b><small>{b.travelPackage.title} · Remaining {moneyText(remaining,b.currency)}</small></span><input type="number" min="0" max={remaining} step="0.01" placeholder="0.00" value={allocations[b.id]||""} onChange={(e)=>setAllocations((a)=>({...a,[b.id]:e.target.value}))}/></label>;
            })}
            {!openBills.some((b)=>b.currency===form.currency) && <p className="allocation-empty">No outstanding bills in {form.currency}. Change currency or record a supplier bill first.</p>}
            <div className="allocation-total"><span>Allocated total</span><b>{moneyText(allocatedAmount,form.currency)}</b><span>Payment entered</span><b>{moneyText(form.amount,form.currency)}</b></div>
            {allocatedAmount > Number(form.amount||0) && <p className="form-error">Allocated total cannot exceed the payment amount.</p>}
          </div>
          <label className="wide-field">Notes<textarea rows={2} value={form.notes} onChange={(e)=>setField("notes",e.target.value)}/></label>
        </>}
      </div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy || (tab === "payments" && allocatedAmount > Number(form.amount||0))}>{busy ? "Saving…" : "Save " + (tab === "receipts" ? "receipt" : tab === "bills" ? "bill" : "payment")}</button></div>
    </form></div>}
  </>;
}
