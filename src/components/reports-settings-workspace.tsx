"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Building2, Download, RefreshCw, Save } from "lucide-react";

type CurrencyTotal = { currency: string; amount: number };
type ReportData = {
  filters: { from: string | null; to: string | null };
  counts: { customers: number; activeSuppliers: number; packages: number; bookings: number; receipts: number; supplierBills: number };
  totals: {
    packageSalesByCurrency: CurrencyTotal[];
    bookingSupplierCostsByCurrency: CurrencyTotal[];
    customerReceiptsByCurrency: CurrencyTotal[];
    supplierBillsByCurrency: CurrencyTotal[];
  };
  notes: string[];
};
type Company = {
  id: string; name: string; legalName: string | null; email: string | null; phone: string | null;
  gstin: string | null; baseCurrency: string; timezone: string; address: string | null;
};
type FormState = {
  name: string; legalName: string; email: string; phone: string; gstin: string;
  baseCurrency: string; timezone: string; address: string;
};
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

function Totals({ title, values }: { title: string; values: CurrencyTotal[] }) {
  return <article className="panel report-total-card">
    <h3>{title}</h3>
    {values.length ? values.map((item) => <div className="report-currency-line" key={item.currency}><span>{item.currency}</span><b>{money(item.amount, item.currency)}</b></div>) : <p className="report-no-data">No records in this date range.</p>}
  </article>;
}

export function ReportsWorkspace() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch("/api/reports" + (params.toString() ? "?" + params.toString() : ""), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load reports.");
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reports.");
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const exports = [
    { type: "packages", title: "Travel packages", description: "Package values, destination, dates and customer details." },
    { type: "bookings", title: "Bookings", description: "Service, supplier, confirmation and cost details." },
    { type: "receipts", title: "Customer receipts", description: "Receipts recorded, including voided entries." },
    { type: "supplier-bills", title: "Supplier bills", description: "Supplier invoices, tax amounts and payment status." },
  ];

  function exportHref(type: string) {
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return "/api/reports/export?" + params.toString();
  }

  return <>
    <div className="page-heading">
      <div><div className="eyebrow">FINANCE & INSIGHTS</div><h1>Reports</h1><p>Review live agency totals and export your records for further analysis.</p></div>
      <button className="button button-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/>{loading ? "Refreshing…" : "Refresh reports"}</button>
    </div>
    <section className="panel report-filter-panel">
      <div><b>Report date range</b><p>Choose dates to filter package travel start, service, receipt and supplier bill dates.</p></div>
      <div className="report-filter-fields">
        <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)}/></label>
        <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)}/></label>
        <button className="button button-primary" onClick={load} disabled={loading}><BarChart3 size={15}/> Apply dates</button>
        <button className="button button-secondary" onClick={() => { setFrom(""); setTo(""); }} disabled={!from && !to}>Clear</button>
      </div>
    </section>
    {error && <div className="form-error workflow-error">{error}</div>}
    {loading && !data ? <div className="workflow-empty">Loading your agency reports…</div> : data && <>
      <section className="stats-grid report-count-grid">
        <article className="stat-card"><div className="stat-top"><span>Customers</span></div><strong>{data.counts.customers}</strong><small>All agency customers</small></article>
        <article className="stat-card"><div className="stat-top"><span>Active suppliers</span></div><strong>{data.counts.activeSuppliers}</strong><small>Available suppliers</small></article>
        <article className="stat-card"><div className="stat-top"><span>Packages in range</span></div><strong>{data.counts.packages}</strong><small>Based on travel start date</small></article>
        <article className="stat-card"><div className="stat-top"><span>Bookings in range</span></div><strong>{data.counts.bookings}</strong><small>Based on service date</small></article>
      </section>
      <section className="report-totals-grid">
        <Totals title="Package sale values" values={data.totals.packageSalesByCurrency}/>
        <Totals title="Booking supplier costs" values={data.totals.bookingSupplierCostsByCurrency}/>
        <Totals title="Customer receipts" values={data.totals.customerReceiptsByCurrency}/>
        <Totals title="Supplier bills" values={data.totals.supplierBillsByCurrency}/>
      </section>
      <section className="panel report-export-panel">
        <div className="panel-heading"><div><h2>Download detailed reports</h2><p>CSV files open in Excel and other spreadsheet apps.</p></div></div>
        <div className="report-export-grid">{exports.map((item) => <article className="report-export-card" key={item.type}>
          <div><b>{item.title}</b><p>{item.description}</p></div>
          <a className="button button-secondary" href={exportHref(item.type)}><Download size={15}/> Download CSV</a>
        </article>)}</div>
      </section>
      <div className="section-help"><b>How to read these totals</b>{data.notes.map((note) => <p key={note}>{note}</p>)}</div>
    </>}
  </>;
}

export function SettingsWorkspace() {
  const [form, setForm] = useState<FormState>({
    name: "", legalName: "", email: "", phone: "", gstin: "", baseCurrency: "INR", timezone: "Asia/Kolkata", address: "",
  });
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load agency settings.");
      const company: Company = result.company;
      setForm({
        name: company.name || "", legalName: company.legalName || "", email: company.email || "",
        phone: company.phone || "", gstin: company.gstin || "", baseCurrency: company.baseCurrency || "INR",
        timezone: company.timezone || "Asia/Kolkata", address: company.address || "",
      });
      setCanEdit(Boolean(result.canEdit));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load agency settings."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField(key: keyof FormState, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy || !canEdit) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, baseCurrency: form.baseCurrency.toUpperCase(), gstin: form.gstin.toUpperCase() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save agency settings.");
      const company: Company = result.company;
      setForm({
        name: company.name || "", legalName: company.legalName || "", email: company.email || "",
        phone: company.phone || "", gstin: company.gstin || "", baseCurrency: company.baseCurrency || "INR",
        timezone: company.timezone || "Asia/Kolkata", address: company.address || "",
      });
      setNotice("Agency settings saved successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save agency settings."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">WORKSPACE ADMINISTRATION</div><h1>Agency settings</h1><p>Manage your agency identity, contact information and regional defaults.</p></div></div>
    {loading ? <div className="workflow-empty">Loading agency settings…</div> : <section className="panel settings-panel">
      <div className="panel-heading"><div><h2>Business profile</h2><p>These details can be used on future customer documents and reports.</p></div><span className="status status-blue">{canEdit ? "Owner / admin access" : "View only"}</span></div>
      {notice && <div className="workflow-notice">{notice}</div>}{error && <div className="form-error workflow-error">{error}</div>}
      <form onSubmit={save}>
        <div className="customer-form-grid">
          <label>Agency name *<input required maxLength={160} disabled={!canEdit} value={form.name} onChange={(e) => setField("name", e.target.value)}/></label>
          <label>Legal name<input disabled={!canEdit} value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} placeholder="Registered legal name"/></label>
          <label>Agency email<input type="email" disabled={!canEdit} value={form.email} onChange={(e) => setField("email", e.target.value)}/></label>
          <label>Phone / WhatsApp<input disabled={!canEdit} value={form.phone} onChange={(e) => setField("phone", e.target.value)}/></label>
          <label>GSTIN<input maxLength={15} disabled={!canEdit} value={form.gstin} onChange={(e) => setField("gstin", e.target.value.toUpperCase())} placeholder="15-character GSTIN"/></label>
          <label>Default currency<input maxLength={3} disabled={!canEdit} value={form.baseCurrency} onChange={(e) => setField("baseCurrency", e.target.value.toUpperCase())}/></label>
          <label>Time zone<input disabled={!canEdit} value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} placeholder="Asia/Kolkata"/></label>
          <label className="wide-field">Business address<textarea rows={3} disabled={!canEdit} value={form.address} onChange={(e) => setField("address", e.target.value)}/></label>
        </div>
        {canEdit && <div className="modal-actions"><button className="button button-primary" disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save agency settings"}</button></div>}
        {!canEdit && <p className="settings-readonly-note">Only an agency owner or administrator can edit these details. Contact your agency owner to make changes.</p>}
      </form>
    </section>}
  </>;
}
