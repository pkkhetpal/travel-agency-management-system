"use client";

export type PrintEntry = { label: string; value: string | number | null | undefined };
export type PrintImage = { url: string; caption?: string; sourceUrl?: string };
export type PrintSection = { title: string; entries?: PrintEntry[]; body?: string; images?: PrintImage[] };
export type PrintableDocument = {
  agencyName?: string;
  title: string;
  reference: string;
  subtitle?: string;
  customer?: string;
  sections: PrintSection[];
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

function safeWebUrl(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "document";
}

export function openPrintableDocument(document: PrintableDocument): void {
  const popup = window.open("", "_blank");
  if (!popup) {
    window.alert("Please allow pop-ups for TravelDesk, then select Download PDF again.");
    return;
  }

  const preparedOn = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date());

  const sectionsHtml = document.sections.map((section) => {
    const entries = (section.entries || []).filter((entry) => entry.value !== null && entry.value !== undefined && String(entry.value).trim() !== "");
    const entriesHtml = entries.length
      ? '<table class="details"><tbody>' + entries.map((entry) =>
          '<tr><th>' + escapeHtml(entry.label) + '</th><td>' + escapeHtml(entry.value).replace(/\n/g, "<br>") + '</td></tr>'
        ).join("") + '</tbody></table>'
      : "";
    const bodyHtml = section.body
      ? '<div class="body-copy">' + escapeHtml(section.body).replace(/\n/g, "<br>") + '</div>'
      : "";
    const imagesHtml = (section.images || []).map((item) => {
      const imageUrl = safeWebUrl(item.url);
      if (!imageUrl) return "";
      const sourceUrl = safeWebUrl(item.sourceUrl);
      return '<figure><img src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(item.caption || "Itinerary photo") + '"><figcaption>' +
        escapeHtml(item.caption || "") +
        (sourceUrl ? ' · <a href="' + escapeHtml(sourceUrl) + '">Photo source and license</a>' : "") +
        '</figcaption></figure>';
    }).join("");
    return '<section class="section"><h2>' + escapeHtml(section.title) + '</h2>' + entriesHtml + bodyHtml +
      (imagesHtml ? '<div class="photos">' + imagesHtml + '</div>' : "") + '</section>';
  }).join("");

  const agencyName = escapeHtml(document.agencyName || "TravelDesk");
  const title = escapeHtml(document.title);
  const reference = escapeHtml(document.reference);
  const subtitle = document.subtitle ? '<p class="subtitle">' + escapeHtml(document.subtitle) + '</p>' : "";
  const customer = document.customer ? '<div><span>Prepared for</span><strong>' + escapeHtml(document.customer) + '</strong></div>' : "";

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${slug(document.reference)}-${slug(document.title)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #172033; font: 12px/1.55 Arial, Helvetica, sans-serif; background: #fff; }
  .toolbar { display: flex; justify-content: flex-end; padding: 14px 0; }
  .toolbar button { border: 0; border-radius: 7px; padding: 10px 16px; color: #fff; background: #173b72; font-weight: 700; cursor: pointer; }
  .document { max-width: 820px; margin: 0 auto; }
  .masthead { border-bottom: 3px solid #173b72; padding: 8px 0 16px; display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
  .brand { color: #173b72; font-size: 19px; font-weight: 800; letter-spacing: .2px; }
  .brand small { display: block; margin-top: 3px; color: #a98445; font-size: 9px; font-weight: 700; letter-spacing: 1.8px; }
  .document-type { text-align: right; }
  h1 { margin: 22px 0 4px; font-size: 25px; line-height: 1.2; }
  .subtitle { margin: 0 0 16px; color: #657189; font-size: 13px; }
  .meta { display: flex; flex-wrap: wrap; gap: 24px; margin: 18px 0 24px; padding: 12px 14px; background: #f3f6fa; border-radius: 7px; }
  .meta span { display: block; color: #69758b; font-size: 9px; text-transform: uppercase; letter-spacing: .7px; }
  .meta strong { display: block; margin-top: 2px; font-size: 12px; }
  .section { margin: 20px 0 0; break-inside: avoid; }
  h2 { margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid #dbe2eb; color: #173b72; font-size: 14px; }
  .details { width: 100%; border-collapse: collapse; }
  .details th, .details td { padding: 7px 9px; border-bottom: 1px solid #edf0f4; vertical-align: top; text-align: left; }
  .details th { width: 29%; color: #637087; font-weight: 600; }
  .details td { color: #172033; overflow-wrap: anywhere; }
  .body-copy { white-space: normal; overflow-wrap: anywhere; padding: 4px 2px; }
  .photos { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  figure { width: 31%; margin: 0; break-inside: avoid; }
  figure img { width: 100%; height: 125px; object-fit: cover; border-radius: 5px; }
  figcaption { color: #68758a; font-size: 9px; overflow-wrap: anywhere; }
  a { color: #245b9b; }
  .footer { margin-top: 32px; padding-top: 9px; border-top: 1px solid #dbe2eb; color: #788397; font-size: 9px; }
  @media print { .toolbar { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="document">
  <div class="toolbar"><button id="printButton" type="button">Print / Save as PDF</button></div>
  <header class="masthead"><div class="brand">${agencyName}<small>LUXURY SIMPLIFIED</small></div><div class="document-type"><strong>${reference}</strong><br><span>Prepared on ${escapeHtml(preparedOn)}</span></div></header>
  <h1>${title}</h1>
  ${subtitle}
  <div class="meta">${customer}<div><span>Reference</span><strong>${reference}</strong></div></div>
  ${sectionsHtml}
  <div class="footer">Prepared by ${agencyName} · Luxury Simplified. Please review travel dates, prices, inclusions and booking confirmations before sharing.</div>
</div>
</body>
</html>`);
  popup.document.close();
  popup.document.getElementById("printButton")?.addEventListener("click", () => popup.print());
  const images = Array.from(popup.document.images);
  const imageLoads = images.map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      }));
  void Promise.race([
    Promise.all(imageLoads),
    new Promise<void>((resolve) => popup.setTimeout(resolve, 3500)),
  ]).then(() => {
    if (popup.closed) return;
    popup.focus();
    popup.print();
  });
}
