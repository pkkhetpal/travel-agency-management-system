"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Edit2, Plus, Search, Trash2, X, Users, ClipboardList, FileText, Plane } from "lucide-react";

type Kind = "enquiries" | "quotations" | "packages";
type Customer = { id: string; name: string; email: string | null; mobile: string | null };
type Enquiry = {
  id: string; referenceNo: string; customerId: string; destination: string | null;
  travelStart: string | null; travelEnd: string | null; adults: number; children: number;
  budget: string | number | null; currency: string; travelType: string | null; notes: string | null;
  status: string; nextFollowUp: string | null; customer: { id: string; name: string };
};
type Quotation = {
  id: string; referenceNo: string; customerId: string; enquiryId: string | null; title: string;
  status: string; currency: string; subtotal: string | number; discount: string | number;
  taxAmount: string | number; totalAmount: string | number; validUntil: string | null; notes: string | null;
  customer: { id: string; name: string }; enquiry?: { id: string; referenceNo: string; destination: string | null } | null;
};
type TravelPackage = {
  id: string; referenceNo: string; customerId: string; quotationId: string | null; title: string;
  destination: string | null; travelStart: string | null; travelEnd: string | null; adults: number;
  children: number; status: string; currency: string; exchangeRate: string | number;
  saleAmount: string | number; notes: string | null; customer: { id: string; name: string };
  quotation?: { id: string; referenceNo: string; title: string } | null;
};
type RecordItem = Enquiry | Quotation | TravelPackage;
type FormState = Record<string, string>;
const statusOptions: Record<Kind, string[]> = {
  enquiries: ["NEW", "FOLLOW_UP", "QUOTED", "CONVERTED", "LOST"],
  quotations: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
  packages: ["DRAFT", "PLANNING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
};
const labels: Record<string, string> = {
  NEW: "New", FOLLOW_UP: "Follow-up", QUOTED: "Quoted", CONVERTED: "Converted", LOST: "Lost",
  DRAFT: "Draft", SENT: "Sent", ACCEPTED: "Accepted", REJECTED: "Rejected", EXPIRED: "Expired",
  PLANNING: "Planning", CONFIRMED: "Confirmed", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
const initialForms: Record<Kind, FormState> = {
  enquiries: { customerId: "", destination: "", travelStart: "", travelEnd: "", adults: "1", children: "0", budget: "", currency: "INR", travelType: "", notes: "", status: "NEW", nextFollowUp: "" },
  quotations: { customerId: "", enquiryId: "", title: "", currency: "INR", subtotal: "0", discount: "0", taxAmount: "0", status: "DRAFT", validUntil: "", notes: "" },
  packages: { customerId: "", quotationId: "", title: "", destination: "", travelStart: "", travelEnd: "", adults: "1", children: "0", currency: "INR", exchangeRate: "1", saleAmount: "0", status: "DRAFT", notes: "" },
};
const config = {
  enquiries: { title: "Enquiries", singular: "enquiry", description: "Capture travel requests, budgets and follow-up dates.", icon: ClipboardList, endpoint: "/api/enquiries" },
  quotations: { title: "Quotations", singular: "quotation", description: "Prepare customer proposals and track quotation decisions.", icon: FileText, endpoint: "/api/quotations" },
  packages: { title: "Packages", singular: "package", description: "Turn accepted proposals into managed customer trips.", icon: Plane, endpoint: "/api/packages" },
};

function inputDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}
function textValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}
function statusTone(value: string) {
  if (["CONFIRMED", "COMPLETED", "ACCEPTED", "CONVERTED"].includes(value)) return "green";
  if (["NEW", "DRAFT", "PLANNING", "SENT"].includes(value)) return "blue";
  if (["LOST", "REJECTED", "EXPIRED", "CANCELLED"].includes(value)) return "gray";
  return "amber";
}
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function SalesWorkspace({ kind }: { kind: Kind }) {
  const current = config[kind];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [form, setForm] = useState<FormState>(initialForms[kind]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const records: RecordItem[] = kind === "enquiries" ? enquiries : kind === "quotations" ? quotations : packages;

  const load = useCallback(async () => {
    const dependencyEndpoint = kind === "quotations" ? "/api/enquiries" : kind === "packages" ? "/api/quotations" : null;
    const responses = await Promise.all([
      fetch("/api/customers", { cache: "no-store" }),
      fetch(current.endpoint, { cache: "no-store" }),
      ...(dependencyEndpoint ? [fetch(dependencyEndpoint, { cache: "no-store" })] : []),
    ]);
    const customerData = await responses[0].json();
    const recordData = await responses[1].json();
    const dependencyData = responses[2] ? await responses[2].json() : null;
    if (!responses[0].ok) throw new Error(customerData.error || "Could not load customers.");
    if (!responses[1].ok) throw new Error(recordData.error || "Could not load records.");
    if (responses[2] && !responses[2].ok) throw new Error(dependencyData.error || "Could not load linked records.");
    setCustomers(customerData.customers || []);
    if (kind === "quotations") setEnquiries(dependencyData.enquiries || []);
    if (kind === "packages") setQuotations(dependencyData.quotations || []);
    if (kind === "enquiries") setEnquiries(recordData.enquiries || []);
    if (kind === "quotations") setQuotations(recordData.quotations || []);
    if (kind === "packages") setPackages(recordData.packages || []);
  }, [current.endpoint, kind]);

  useEffect(() => {
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load this workspace."));
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || open || editing) return;
    const params = new URLSearchParams(window.location.search);
    const requestedId = kind === "quotations" ? params.get("enquiryId") : kind === "packages" ? params.get("quotationId") : null;
    if (!requestedId) return;
    if (kind === "quotations") {
      const enquiry = enquiries.find((item) => item.id === requestedId);
      if (!enquiry) return;
      setEditing(null);
      setForm({ ...initialForms.quotations, customerId: enquiry.customerId, enquiryId: enquiry.id, title: enquiry.destination ? enquiry.destination + " travel proposal" : "Travel proposal", currency: enquiry.currency });
      setOpen(true);
    }
    if (kind === "packages") {
      const quotation = quotations.find((item) => item.id === requestedId);
      if (!quotation) return;
      setEditing(null);
      setForm({ ...initialForms.packages, customerId: quotation.customerId, quotationId: quotation.id, title: quotation.title, currency: quotation.currency, saleAmount: String(quotation.totalAmount) });
      setOpen(true);
    }
  }, [kind, enquiries, quotations, open, editing]);

  const filtered = useMemo(() => records.filter((record) => {
    const customerName = "customer" in record ? record.customer.name : "";
    const reference = record.referenceNo || "";
    const title = "title" in record ? record.title : ("destination" in record ? record.destination || "Travel enquiry" : "");
    return [customerName, reference, title].some((value) => value.toLowerCase().includes(query.toLowerCase()));
  }), [records, query]);

  function start(record?: RecordItem) {
    setEditing(record || null);
    setError("");
    setNotice("");
    if (!record) {
      setForm({ ...initialForms[kind] });
    } else if (kind === "enquiries") {
      const item = record as Enquiry;
      setForm({ customerId: item.customerId, destination: textValue(item.destination), travelStart: inputDate(item.travelStart), travelEnd: inputDate(item.travelEnd), adults: String(item.adults), children: String(item.children), budget: textValue(item.budget), currency: item.currency, travelType: textValue(item.travelType), notes: textValue(item.notes), status: item.status, nextFollowUp: inputDate(item.nextFollowUp) });
    } else if (kind === "quotations") {
      const item = record as Quotation;
      setForm({ customerId: item.customerId, enquiryId: textValue(item.enquiryId), title: item.title, currency: item.currency, subtotal: textValue(item.subtotal), discount: textValue(item.discount), taxAmount: textValue(item.taxAmount), status: item.status, validUntil: inputDate(item.validUntil), notes: textValue(item.notes) });
    } else {
      const item = record as TravelPackage;
      setForm({ customerId: item.customerId, quotationId: textValue(item.quotationId), title: item.title, destination: textValue(item.destination), travelStart: inputDate(item.travelStart), travelEnd: inputDate(item.travelEnd), adults: String(item.adults), children: String(item.children), currency: item.currency, exchangeRate: textValue(item.exchangeRate), saleAmount: textValue(item.saleAmount), status: item.status, notes: textValue(item.notes) });
    }
    setOpen(true);
  }

  function setField(key: string, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const url = editing ? current.endpoint + "/" + editing.id : current.endpoint;
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save record.");
      await load();
      setOpen(false);
      setEditing(null);
      setNotice(editing ? "Changes saved." : current.singular[0].toUpperCase() + current.singular.slice(1) + " saved successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save record.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(record: RecordItem) {
    const reference = record.referenceNo;
    if (!window.confirm("Delete " + reference + "? This cannot be undone.")) return;
    setError("");
    const response = await fetch(current.endpoint + "/" + record.id, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not delete record.");
      return;
    }
    await load();
    setNotice("Record deleted.");
  }

  const calculatedTotal = Math.max(0, Number(form.subtotal || 0) - Number(form.discount || 0) + Number(form.taxAmount || 0));
  const heading = current.title;

  return <>
    <div className="page-heading">
      <div><div className="eyebrow">LIVE AGENCY WORKSPACE</div><h1>{heading}</h1><p>{current.description}</p></div>
      <button className="button button-primary" onClick={() => start()} disabled={!customers.length} title={!customers.length ? "Add a customer before creating this record." : undefined}><Plus size={17}/> New {current.singular}</button>
    </div>

    <section className="stats-grid workflow-stats">
      <article className="stat-card"><div className="stat-top"><span>Total {current.title.toLowerCase()}</span><span className="stat-icon blue">{kind === "enquiries" ? <ClipboardList size={18}/> : kind === "quotations" ? <FileText size={18}/> : <Plane size={18}/>}</span></div><strong>{records.length}</strong><small>Saved in your agency</small></article>
      <article className="stat-card"><div className="stat-top"><span>Customers</span><span className="stat-icon purple"><Users size={18}/></span></div><strong>{customers.length}</strong><small>Available for selection</small></article>
      <article className="stat-card"><div className="stat-top"><span>{kind === "enquiries" ? "Follow-ups due" : kind === "quotations" ? "Accepted" : "Confirmed"}</span></div><strong>{kind === "enquiries" ? enquiries.filter((item) => item.nextFollowUp && new Date(item.nextFollowUp) <= new Date() && !["CONVERTED", "LOST"].includes(item.status)).length : kind === "quotations" ? quotations.filter((item) => item.status === "ACCEPTED").length : packages.filter((item) => item.status === "CONFIRMED").length}</strong><small>Based on current records</small></article>
    </section>

    {notice && <div className="workflow-notice">{notice}</div>}
    {error && !open && <div className="form-error workflow-error">{error}</div>}
    <section className="panel section-list workflow-list">
      <div className="list-toolbar"><div><h2>{current.title} register</h2><p>Search, edit and move records through your sales workflow.</p></div><label className="list-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, reference or destination"/></label></div>
      {!customers.length && <div className="workflow-empty"><Users size={28}/><b>Add your first customer first</b><p>Enquiries, quotations and packages must be linked to an agency customer.</p><Link className="button button-primary" href="/customers">Open customers <ArrowRight size={15}/></Link></div>}
      {customers.length > 0 && !filtered.length && <div className="workflow-empty"><current.icon size={28}/><b>{query ? "No matching records" : "No " + current.title.toLowerCase() + " yet"}</b><p>{query ? "Try a different search." : "Create your first " + current.singular + " using the button above."}</p><button className="button button-primary" onClick={() => start()}><Plus size={15}/> New {current.singular}</button></div>}
      {!!filtered.length && <div className="table-wrap"><table><thead><tr><th>REFERENCE / DETAILS</th><th>CUSTOMER</th><th>{kind === "quotations" ? "TOTAL" : "TRAVEL DATE"}</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
        {filtered.map((record) => {
          const customer = record.customer.name;
          const reference = record.referenceNo;
          const status = record.status;
          const title = kind === "enquiries" ? ((record as Enquiry).destination || "Travel enquiry") : (record as Quotation | TravelPackage).title;
          const detail = kind === "enquiries" ? (record as Enquiry).travelType || "Travel request" : kind === "quotations" ? "Quotation proposal" : (record as TravelPackage).destination || "Travel package";
          const date = kind === "enquiries" ? (record as Enquiry).travelStart : kind === "quotations" ? (record as Quotation).validUntil : (record as TravelPackage).travelStart;
          const value = kind === "quotations" ? money((record as Quotation).totalAmount, (record as Quotation).currency) : formatDate(date);
          return <tr key={record.id}>
            <td><b>{title}</b><small>{reference} · {detail}</small></td>
            <td>{customer}</td>
            <td>{value}</td>
            <td><span className={`status status-${statusTone(status)}`}>{labels[status] || status}</span></td>
            <td><div className="workflow-actions">
              <button className="icon-button" title="Edit" onClick={() => start(record)}><Edit2 size={15}/></button>
              <button className="icon-button danger-icon" title="Delete" onClick={() => remove(record)}><Trash2 size={15}/></button>
              {kind === "enquiries" && <Link className="workflow-link" href={"/quotations?enquiryId=" + record.id}>Create quotation</Link>}
              {kind === "quotations" && <Link className="workflow-link" href={"/packages?quotationId=" + record.id}>Make package</Link>}
            </div></td>
          </tr>;
        })}
      </tbody></table></div>}
      <div className="list-footer">Live database records <span>{filtered.length} shown</span></div>
    </section>

    {open && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form className="customer-modal workflow-modal" onSubmit={save}>
        <div className="modal-heading"><div><h2>{editing ? "Edit " + current.singular : "New " + current.singular}</h2><p>Changes are saved to your agency database.</p></div><button type="button" className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
        {error && <div className="form-error">{error}</div>}
        <div className="customer-form-grid">
          <label>Customer *
            <select required value={form.customerId} onChange={(event) => setField("customerId", event.target.value)}>
              <option value="">Select a customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          {kind === "enquiries" && <>
            <label>Destination<input value={form.destination} onChange={(event) => setField("destination", event.target.value)} placeholder="e.g. Singapore"/></label>
            <label>Travel type<select value={form.travelType} onChange={(event) => setField("travelType", event.target.value)}><option value="">Select type</option>{["Domestic","International","Group","Corporate","Honeymoon","Family","Customised","Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Travel start<input type="date" value={form.travelStart} onChange={(event) => setField("travelStart", event.target.value)}/></label>
            <label>Travel end<input type="date" value={form.travelEnd} onChange={(event) => setField("travelEnd", event.target.value)}/></label>
            <label>Adults<input type="number" min="1" step="1" value={form.adults} onChange={(event) => setField("adults", event.target.value)}/></label>
            <label>Children<input type="number" min="0" step="1" value={form.children} onChange={(event) => setField("children", event.target.value)}/></label>
            <label>Estimated budget<input type="number" min="0" step="0.01" value={form.budget} onChange={(event) => setField("budget", event.target.value)} placeholder="0.00"/></label>
            <label>Currency<input maxLength={3} value={form.currency} onChange={(event) => setField("currency", event.target.value.toUpperCase())}/></label>
            <label>Next follow-up<input type="date" value={form.nextFollowUp} onChange={(event) => setField("nextFollowUp", event.target.value)}/></label>
            <label>Status<select value={form.status} onChange={(event) => setField("status", event.target.value)}>{statusOptions.enquiries.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
          </>}
          {kind === "quotations" && <>
            <label>Linked enquiry<select value={form.enquiryId} onChange={(event) => setField("enquiryId", event.target.value)}><option value="">No linked enquiry</option>{enquiries.filter((item) => item.customerId === form.customerId).map((item) => <option key={item.id} value={item.id}>{item.referenceNo} · {item.destination || "Travel enquiry"}</option>)}</select></label>
            <label className="wide-field">Quotation title *<input required value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. Singapore family holiday"/></label>
            <label>Currency<input maxLength={3} value={form.currency} onChange={(event) => setField("currency", event.target.value.toUpperCase())}/></label>
            <label>Subtotal<input type="number" min="0" step="0.01" value={form.subtotal} onChange={(event) => setField("subtotal", event.target.value)}/></label>
            <label>Discount<input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setField("discount", event.target.value)}/></label>
            <label>Tax amount<input type="number" min="0" step="0.01" value={form.taxAmount} onChange={(event) => setField("taxAmount", event.target.value)}/></label>
            <label>Status<select value={form.status} onChange={(event) => setField("status", event.target.value)}>{statusOptions.quotations.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
            <label>Valid until<input type="date" value={form.validUntil} onChange={(event) => setField("validUntil", event.target.value)}/></label>
            <div className="workflow-total"><span>Calculated quotation total</span><strong>{money(calculatedTotal, /^[A-Z]{3}$/.test(form.currency) ? form.currency : "INR")}</strong><small>Subtotal − discount + tax</small></div>
          </>}
          {kind === "packages" && <>
            <label>Linked quotation<select value={form.quotationId} onChange={(event) => setField("quotationId", event.target.value)}><option value="">No linked quotation</option>{quotations.filter((item) => item.customerId === form.customerId).map((item) => <option key={item.id} value={item.id}>{item.referenceNo} · {item.title}</option>)}</select></label>
            <label className="wide-field">Package title *<input required value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. Singapore city escape"/></label>
            <label>Destination<input value={form.destination} onChange={(event) => setField("destination", event.target.value)}/></label>
            <label>Package status<select value={form.status} onChange={(event) => setField("status", event.target.value)}>{statusOptions.packages.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
            <label>Travel start<input type="date" value={form.travelStart} onChange={(event) => setField("travelStart", event.target.value)}/></label>
            <label>Travel end<input type="date" value={form.travelEnd} onChange={(event) => setField("travelEnd", event.target.value)}/></label>
            <label>Adults<input type="number" min="1" step="1" value={form.adults} onChange={(event) => setField("adults", event.target.value)}/></label>
            <label>Children<input type="number" min="0" step="1" value={form.children} onChange={(event) => setField("children", event.target.value)}/></label>
            <label>Sale amount<input type="number" min="0" step="0.01" value={form.saleAmount} onChange={(event) => setField("saleAmount", event.target.value)}/></label>
            <label>Currency<input maxLength={3} value={form.currency} onChange={(event) => setField("currency", event.target.value.toUpperCase())}/></label>
            <label>Exchange rate<input type="number" min="0.00000001" step="0.00000001" value={form.exchangeRate} onChange={(event) => setField("exchangeRate", event.target.value)}/></label>
          </>}
          <label className="wide-field">Notes<textarea rows={3} value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Additional details for your team"/></label>
        </div>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save " + current.singular}</button></div>
      </form>
    </div>}
  </>;
}
