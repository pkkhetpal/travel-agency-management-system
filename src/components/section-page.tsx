import Link from "next/link";
import { Plus, Search, ArrowUpRight, MoreHorizontal } from "lucide-react";

type RecordRow = { title: string; subtitle: string; detail: string; status: string; tone: "green"|"blue"|"amber"|"gray" };
type SectionConfig = { title: string; description: string; action: string; metrics: readonly {label:string;value:string}[]; columns: readonly string[]; rows: readonly RecordRow[] };

export function SectionPage({ config }: { config: SectionConfig }) {
  return <><div className="page-heading"><div><div className="eyebrow">TRAVELDESK WORKSPACE</div><h1>{config.title}</h1><p>{config.description}</p></div><button className="button button-primary"><Plus size={16}/>{config.action}</button></div>
    <div className="section-metrics">{config.metrics.map(m=><article className="panel metric-card" key={m.label}><small>{m.label}</small><strong>{m.value}</strong></article>)}</div>
    <section className="panel section-list"><div className="list-toolbar"><div><h2>All {config.title.toLowerCase()}</h2><p>Manage and review your latest records.</p></div><label className="list-search"><Search size={15}/><input placeholder="Search records..."/></label></div>
      <div className="table-wrap"><table><thead><tr>{config.columns.map(c=><th key={c}>{c}</th>)}<th></th></tr></thead><tbody>{config.rows.map((r,i)=><tr key={r.title}><td><b>{r.title}</b><small>{r.subtitle}</small></td><td>{r.detail}</td><td><span className={`status status-${r.tone}`}>{r.status}</span></td><td><button className="row-menu" aria-label={`More options for ${r.title}`}><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div>
      <div className="list-footer">Showing {config.rows.length} sample records <span>Demo data · Database connection not configured</span></div>
    </section>
    <div className="section-help"><b>Next development step</b><p>This page is ready for its create, edit, detail and search workflows. These will be connected to PostgreSQL as the application modules are implemented.</p><Link href="/">Back to dashboard <ArrowUpRight size={14}/></Link></div>
  </>;
}
