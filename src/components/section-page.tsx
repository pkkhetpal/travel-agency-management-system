import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

type RecordRow = { title: string; subtitle: string; detail: string; status: string; tone: "green"|"blue"|"amber"|"gray" };
type SectionConfig = {
  title: string;
  description: string;
  action?: string;
  metrics: readonly {label:string;value:string}[];
  columns: readonly string[];
  rows: readonly RecordRow[];
  note?: string;
};

export function SectionPage({ config }: { config: SectionConfig }) {
  return <>
    <div className="page-heading">
      <div><div className="eyebrow">LIVE AGENCY WORKSPACE</div><h1>{config.title}</h1><p>{config.description}</p></div>
      {config.action && <button className="button button-primary" disabled title="Record creation for this section is not enabled yet."><Plus size={16}/>{config.action}</button>}
    </div>
    <div className="section-metrics">
      {config.metrics.map((metric) => <article className="panel metric-card" key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong></article>)}
    </div>
    <section className="panel section-list">
      <div className="list-toolbar"><div><h2>Agency records</h2><p>Records saved in your TravelDesk database.</p></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}<th>STATUS</th></tr></thead>
          <tbody>
            {config.rows.length ? config.rows.map((row, index) => <tr key={row.subtitle || row.title || index}>
              <td><b>{row.title}</b><small>{row.subtitle}</small></td>
              <td>{row.detail}</td>
              <td><span className={`status status-${row.tone}`}>{row.status}</span></td>
            </tr>) : <tr><td colSpan={3} className="empty-cell">No records yet. This section will show entries after they are added to your agency.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="list-footer">Live records <span>{config.rows.length} found</span></div>
    </section>
    {config.note && <div className="section-help"><b>About this section</b><p>{config.note}</p><Link href="/">Back to dashboard <ArrowUpRight size={14}/></Link></div>}
  </>;
}
