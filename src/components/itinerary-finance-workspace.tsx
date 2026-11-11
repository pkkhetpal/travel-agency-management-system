"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Edit2, FileDown, FileText, Plus, Receipt, Search, Trash2, Wallet, X } from "lucide-react";
import { openPrintableDocument } from "@/lib/print-document";

type BookingOption = { id: string; serviceType: string; description: string; serviceDate: string | null; confirmationNo: string | null; status: string; supplier: { name: string } | null };
type PlaceSuggestion = { id: string; name: string; address: string; phone: string; website: string; category: string; latitude: number; longitude: number; mapUrl: string; source: string; kind: string };
type TravelPhoto = { id: string; title: string; url: string; sourceUrl: string; artist: string; license: string; licenseUrl: string };
type PackageOption = { id: string; title: string; referenceNo: string; customer: { name: string }; saleAmount?: string | number; currency?: string; travelStart?: string | null; travelEnd?: string | null; destination?: string | null; adults?: number; children?: number; bookings?: BookingOption[] };
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
const isoDay = (v: string | null | undefined) => v ? v.slice(0, 10) : "";
function addDaysISO(value: string | null | undefined, days: number) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days - 1);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function bookingsForDate(pkg: PackageOption | undefined, date: string) {
  const matches = date ? (pkg?.bookings || []).filter((booking) => isoDay(booking.serviceDate) === date) : [];
  const summary = (booking: BookingOption) => [
    booking.serviceType.replaceAll("_", " ") + ": " + booking.description,
    booking.supplier?.name ? "Supplier: " + booking.supplier.name : "",
    booking.confirmationNo ? "Confirmation: " + booking.confirmationNo : "",
    "Status: " + booking.status.replaceAll("_", " ").toLowerCase(),
  ].filter(Boolean).join(" · ");
  return {
    matches,
    description: matches.map(summary).join("\n"),
    hotel: matches.filter((booking) => booking.serviceType === "HOTEL").map((booking) =>
      [booking.description, booking.supplier?.name ? "Supplier: " + booking.supplier.name : "", booking.confirmationNo ? "Confirmation: " + booking.confirmationNo : ""].filter(Boolean).join(" · ")
    ).join("\n"),
  };
}
const moneyText = (v: unknown, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(v || 0));
const MEDIA_MARKER = "\n\n[[TRAVELDESK_MEDIA:";
function splitSavedPhotos(value: string | null | undefined): { text: string; photos: TravelPhoto[] } {
  const source = value || "";
  const index = source.indexOf(MEDIA_MARKER);
  if (index < 0) return { text: source, photos: [] };
  const encoded = source.slice(index + MEDIA_MARKER.length);
  const end = encoded.indexOf("]]");
  if (end < 0) return { text: source, photos: [] };
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded.slice(0, end)));
    return { text: source.slice(0, index), photos: Array.isArray(parsed) ? parsed.slice(0, 3) : [] };
  } catch {
    return { text: source.slice(0, index), photos: [] };
  }
}
function descriptionWithPhotos(value: string, photos: TravelPhoto[]) {
  const clean = splitSavedPhotos(value).text.trim();
  return photos.length ? clean + MEDIA_MARKER + encodeURIComponent(JSON.stringify(photos.slice(0, 3))) + "]]" : clean;
}
function draftDayPlan(prompt: string, pkg: PackageOption | undefined, dayNumber: number, date: string, bookings: BookingOption[]) {
  const destination = pkg?.destination || "your destination";
  const input = prompt.trim();
  const lower = input.toLowerCase();
  const arrival = /arriv|airport|land|flight into|check.?in/.test(lower);
  const departure = /depart|departure|return flight|airport drop|check.?out/.test(lower);
  const transfer = /transfer|pick.?up|drop.?off/.test(lower);
  const sightseeing = /sightsee|city tour|explore|attraction|visit|tour/.test(lower);
  let title = input || "Explore " + destination;
  if (arrival) title = "Arrival in " + destination;
  else if (departure) title = "Departure from " + destination;
  else if (transfer) title = "Transfer in " + destination;
  else if (!input) title = "Day " + dayNumber + " – " + destination;
  const lines: string[] = [];
  if (arrival) {
    lines.push("Arrive at the airport in " + destination + ". Complete immigration formalities and collect baggage.");
    lines.push(bookings.some((b) => b.serviceType === "TRANSFER")
      ? "Follow the pickup instructions in the transfer booking recorded for this day."
      : "Transfer to the hotel can be arranged separately if it is not already confirmed.");
    lines.push(bookings.some((b) => b.serviceType === "HOTEL")
      ? "Proceed to the hotel listed below and complete check-in according to its confirmation."
      : "Check in to the selected hotel when the room is available; confirm the property's check-in time directly.");
    lines.push("Keep the rest of the day flexible to recover after the journey.");
  } else if (departure) {
    lines.push("Check out of the hotel and confirm that all luggage and travel documents are ready.");
    lines.push(bookings.some((b) => b.serviceType === "TRANSFER")
      ? "Use the transfer pickup details recorded in the confirmed booking."
      : "Arrange transport to the airport and confirm the pickup time separately.");
    lines.push("Proceed to the airport with sufficient time for check-in, security and boarding.");
  } else if (transfer) {
    lines.push("Meet the driver at the agreed pickup point and verify the vehicle and contact details before departure.");
    lines.push("Allow time for traffic and check the destination address before setting off.");
    lines.push("The transport is only confirmed when a matching booking is recorded in TravelDesk.");
  } else if (sightseeing) {
    lines.push("Start after breakfast, subject to the hotel's meal arrangements.");
    lines.push("Explore the attractions selected for " + destination + ". Confirm opening hours, admission and travel time before departure.");
    lines.push("Keep time for meals, rest breaks and travel between stops.");
    lines.push("Return to the hotel or continue with the next confirmed activity.");
  } else {
    lines.push("Begin the day with breakfast, if included in the hotel/package arrangement.");
    lines.push(input ? "Plan the day around: " + input + "." : "Use this day for the activities and experiences selected for " + destination + ".");
    lines.push("Confirm any activity timings, transport and admission requirements before departure.");
    lines.push("Keep some flexible time for meals and rest.");
  }
  if (bookings.length) {
    lines.push("", "Bookings already recorded for " + (date || "this day") + ":");
    bookings.forEach((booking) => {
      lines.push("• " + booking.serviceType.replaceAll("_", " ") + ": " + booking.description +
        (booking.supplier?.name ? " · Supplier: " + booking.supplier.name : "") +
        (booking.confirmationNo ? " · Confirmation: " + booking.confirmationNo : "") +
        " · Status: " + booking.status.replaceAll("_", " ").toLowerCase());
    });
  }
  return { title, description: lines.join("\n") };
}

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
  const touched = useRef({ date: false, title: false, description: false, hotel: false, meals: false });
  const [hotelPlaces, setHotelPlaces] = useState<PlaceSuggestion[]>([]);
  const [activityPlaces, setActivityPlaces] = useState<PlaceSuggestion[]>([]);
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<TravelPhoto[]>([]);
  const [activitySearch, setActivitySearch] = useState("");
  const [placeLoading, setPlaceLoading] = useState<"hotel" | "attraction" | "">("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [assistantNotice, setAssistantNotice] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [agencyName, setAgencyName] = useState("TravelDesk");

  const load = useCallback(async () => {
    const response = await fetch("/api/itineraries", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load itineraries.");
    setDays(data.days || []); setPackages(data.packages || []);
  }, []);
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Could not load itineraries.")).finally(() => setLoading(false)); }, [load]);
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" }).then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.company?.name) setAgencyName(data.company.name); }).catch(() => {});
  }, []);
  const filtered = useMemo(() => days.filter((d) => [d.title, d.description || "", d.travelPackage.title, d.travelPackage.customer.name, d.travelPackage.referenceNo].some((v) => v.toLowerCase().includes(query.toLowerCase()))), [days, query]);
  const selectedPackage = packages.find((pkg) => pkg.id === form.packageId);
  const selectedDateBookings = bookingsForDate(selectedPackage, form.date).matches;

  function start(day?: ItineraryDay) {
    setEditing(day || null); setError(""); setNotice("");
    touched.current = day
      ? { date: true, title: true, description: true, hotel: true, meals: true }
      : { date: false, title: false, description: false, hotel: false, meals: false };
    const saved = splitSavedPhotos(day?.description);
    setSelectedPhotos(saved.photos);
    setPhotos([]);
    setHotelPlaces([]);
    setActivityPlaces([]);
    setAssistantNotice("");
    setAssistantError("");
    setActivitySearch(day?.title || "");
    setForm(day ? { packageId: day.packageId, dayNumber: String(day.dayNumber), date: dateValue(day.date), title: day.title, description: saved.text, hotel: day.hotel || "", meals: day.meals || "" } : { ...blank });
    setOpen(true);
    const packageForDay = day ? packages.find((pkg) => pkg.id === day.packageId) : undefined;
    if (packageForDay?.destination) {
      void searchPlaces("attraction", true, packageForDay.destination);
    }
  }
  function setField(k: string, v: string) {
    if (k in touched.current) touched.current[k as keyof typeof touched.current] = true;
    setForm((f) => ({ ...f, [k]: v }));
  }
  function choosePackage(packageId: string) {
    const pkg = packages.find((item) => item.id === packageId);
    const dayNumber = Math.max(1, Number(form.dayNumber) || 1);
    const date = addDaysISO(pkg?.travelStart, dayNumber);
    touched.current = { date: false, title: false, description: false, hotel: false, meals: false };
    const auto = bookingsForDate(pkg, date);
    setSelectedPhotos([]);
    setPhotos([]);
    setHotelPlaces([]);
    setActivityPlaces([]);
    setActivitySearch("");
    setAssistantNotice("");
    setAssistantError("");
    setForm((f) => ({ ...f, packageId, date, title: pkg ? "Day " + dayNumber + " – " + (pkg.destination || pkg.title) : "", description: auto.description, hotel: auto.hotel, meals: "" }));
    if (pkg?.destination) {
      void searchPlaces("attraction", true, pkg.destination);
    }
  }
  function changeDayNumber(value: string) {
    const dayNumber = Math.max(1, Number(value) || 1);
    const date = !touched.current.date && selectedPackage?.travelStart ? addDaysISO(selectedPackage.travelStart, dayNumber) : form.date;
    const auto = bookingsForDate(selectedPackage, date);
    setForm((f) => ({
      ...f, dayNumber: value,
      ...(!touched.current.date && selectedPackage?.travelStart ? { date } : {}),
      ...(!touched.current.title && selectedPackage ? { title: "Day " + dayNumber + " – " + (selectedPackage.destination || selectedPackage.title) } : {}),
      ...(!touched.current.description ? { description: auto.description } : {}),
      ...(!touched.current.hotel ? { hotel: auto.hotel } : {}),
    }));
  }
  function changeItineraryDate(value: string) {
    touched.current.date = true;
    const auto = bookingsForDate(selectedPackage, value);
    setForm((f) => ({
      ...f, date: value,
      ...(!touched.current.description ? { description: auto.description } : {}),
      ...(!touched.current.hotel ? { hotel: auto.hotel } : {}),
    }));
  }
  function generateDayPlan() {
    const prompt = form.title.trim() || form.description.trim();
    if (!selectedPackage) {
      setAssistantError("Choose a travel package first.");
      return;
    }
    if (!prompt) {
      setAssistantError("Enter a short activity, such as ‘Arrive at Singapore airport’.");
      return;
    }
    const bookingData = bookingsForDate(selectedPackage, form.date).matches;
    const draft = draftDayPlan(prompt, selectedPackage, Number(form.dayNumber) || 1, form.date, bookingData);
    touched.current.title = true;
    touched.current.description = true;
    setForm((f) => ({ ...f, title: draft.title, description: draft.description }));
    setAssistantError("");
    setAssistantNotice("A free template-based draft is ready. Review it and adjust details before saving.");
    setActivitySearch(prompt);
  }
  async function searchPlaces(kind: "hotel" | "attraction", discoverAll = false, destinationOverride?: string) {
    const query = kind === "hotel" ? form.hotel.split("\n")[0].trim() : activitySearch.trim();
    const destination = destinationOverride || selectedPackage?.destination || "";
    const discover = discoverAll || !query;
    if (!discover && query.length < 3) {
      setAssistantError(kind === "hotel" ? "Enter at least 3 letters of a hotel name, or leave it blank to discover hotels in the destination." : "Enter at least 3 letters, or leave the search blank to discover attractions in the destination.");
      return;
    }
    if (discover && destination.trim().length < 2) {
      setAssistantError("Add a destination to this travel package before discovering nearby places.");
      return;
    }
    setPlaceLoading(kind);
    setAssistantError("");
    setAssistantNotice(discover
      ? "Finding mapped " + (kind === "hotel" ? "hotels" : "attractions") + " in " + destination + "…"
      : "");
    try {
      const params = new URLSearchParams({ query: discover ? "" : query, destination, kind });
      if (discover) params.set("discover", "1");
      const response = await fetch("/api/itineraries/places?" + params.toString(), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not search places.");
      const results = (data.places || []) as PlaceSuggestion[];
      if (kind === "hotel") setHotelPlaces(results); else setActivityPlaces(results);
      if (!results.length) {
        setAssistantNotice(discover
          ? "No mapped " + (kind === "hotel" ? "hotels" : "attractions") + " were found near " + destination + ". Try a more specific place or another destination spelling."
          : "No matching OpenStreetMap places were found. Check the spelling or try a shorter search.");
      } else if (discover) {
        setAssistantNotice("Found " + results.length + " mapped " + (kind === "hotel" ? "hotel options" : "places to visit") + " in the " + destination + " area. These are suggestions, not bookings.");
        if (kind === "attraction" && !touched.current.title && !touched.current.description) {
          const stops = results.slice(0, 5);
          const tourLines = [
            "Suggested self-guided sightseeing route for " + destination + ".",
            "Draft stop order is based on nearby mapped places. Check the route, transport, opening hours, ticket requirements and suitability before sharing with the customer.",
            "",
            ...stops.flatMap((place, index) => [
              (index + 1) + ". " + place.name + " (" + place.category + ")",
              "   " + place.address,
              "   Map: " + place.mapUrl,
              "",
            ]),
            "These are sightseeing suggestions only. No guide, transport, entry ticket or tour booking is included or confirmed.",
          ];
          setForm((f) => ({
            ...f,
            title: "Day " + (Number(f.dayNumber) || 1) + " – Explore " + destination,
            description: [f.description.trim(), tourLines.join("\n")].filter(Boolean).join("\n\n"),
          }));
          touched.current.title = true;
          touched.current.description = true;
          setAssistantNotice("Found " + results.length + " mapped places and prepared a day-tour draft from the first " + stops.length + " stops. Review the route and details before saving.");
        }
      } else {
        setAssistantNotice("Found " + results.length + " matching places. Check each result before adding it to the itinerary.");
      }
    } catch (e) {
      setAssistantError(e instanceof Error ? e.message : "Could not search places.");
    } finally {
      setPlaceLoading("");
    }
  }
  async function searchPhotos(queryOverride?: string) {
    const query = (queryOverride || form.title || selectedPackage?.destination || "").trim();
    if (query.length < 3) {
      setAssistantError("Enter a day title, hotel or destination before searching for photos.");
      return;
    }
    setPhotoLoading(true);
    setAssistantError("");
    setAssistantNotice("");
    try {
      const params = new URLSearchParams({ query, destination: selectedPackage?.destination || "" });
      const response = await fetch("/api/itineraries/images?" + params.toString(), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not search photos.");
      setPhotos((data.photos || []) as TravelPhoto[]);
      if (!(data.photos || []).length) setAssistantNotice("No matching Commons photographs were found. Try a broader search.");
    } catch (e) {
      setAssistantError(e instanceof Error ? e.message : "Could not search photos.");
    } finally {
      setPhotoLoading(false);
    }
  }
  function chooseHotel(place: PlaceSuggestion) {
    const details = [
      place.name, place.address,
      place.phone ? "Phone: " + place.phone : "",
      place.website ? "Website: " + place.website : "",
      "Map: " + place.mapUrl,
      "Location source: OpenStreetMap",
    ].filter(Boolean).join("\n");
    touched.current.hotel = true;
    setForm((f) => ({ ...f, hotel: details }));
    setHotelPlaces([]);
    setAssistantNotice("Hotel details added where OpenStreetMap had them. Please verify the property before saving.");
    void searchPhotos(place.name + " hotel");
  }
  function addActivityPlace(place: PlaceSuggestion) {
    const line = "Suggested stop: " + place.name + " — " + place.address + " (verify timings and admission before confirming).";
    touched.current.description = true;
    setForm((f) => ({ ...f, description: [f.description.trim(), line].filter(Boolean).join("\n") }));
    setAssistantNotice("Added as a suggested stop. It is not a confirmed booking.");
  }
  function togglePhoto(photo: TravelPhoto) {
    setSelectedPhotos((current) => current.some((item) => item.id === photo.id)
      ? current.filter((item) => item.id !== photo.id)
      : current.length >= 3 ? current : [...current, photo]);
    if (selectedPhotos.length >= 3 && !selectedPhotos.some((item) => item.id === photo.id)) {
      setAssistantNotice("Up to three photos can be attached to one itinerary day.");
    }
  }
  function close() { setOpen(false); setEditing(null); setError(""); setAssistantError(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form, description: descriptionWithPhotos(form.description, selectedPhotos) };
      const response = await fetch(editing ? "/api/itineraries/" + editing.id : "/api/itineraries", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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

  function exportPackageItinerary(packageId: string) {
    const pkg = packages.find((item) => item.id === packageId);
    if (!pkg) return;
    const packageDays = days.filter((day) => day.packageId === packageId).sort((a, b) => a.dayNumber - b.dayNumber);
    const sections = [
      { title: "Trip overview", entries: [
        { label: "Package", value: pkg.title },
        { label: "Destination", value: pkg.destination || "Not specified" },
        { label: "Travel dates", value: dateText(pkg.travelStart) + " to " + dateText(pkg.travelEnd) },
        { label: "Travellers", value: (pkg.adults ?? 1) + " adult(s), " + (pkg.children ?? 0) + " child(ren)" },
        { label: "Package reference", value: pkg.referenceNo },
      ] },
      ...packageDays.map((day) => {
        const saved = splitSavedPhotos(day.description);
        return {
          title: "Day " + day.dayNumber + " · " + day.title,
          entries: [
            { label: "Date", value: dateText(day.date) },
            { label: "Hotel / accommodation", value: day.hotel || "Not specified" },
            { label: "Meals", value: day.meals || "Not specified" },
          ],
          body: saved.text || "No activity description recorded.",
          images: saved.photos.map((photo) => ({ url: photo.url, caption: photo.title + (photo.artist ? " · " + photo.artist : "") + " · " + photo.license, sourceUrl: photo.sourceUrl })),
        };
      }),
    ];
    openPrintableDocument({
      agencyName,
      title: "Travel Itinerary",
      reference: pkg.referenceNo,
      subtitle: pkg.title + (pkg.destination ? " · " + pkg.destination : ""),
      customer: pkg.customer.name,
      sections,
    });
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
      <div className="table-wrap"><table><thead><tr><th>DAY / PLAN</th><th>PACKAGE / CUSTOMER</th><th>DATE</th><th>HOTEL / MEALS</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map((d) => <tr key={d.id}><td><b>Day {d.dayNumber} · {d.title}</b><small>{splitSavedPhotos(d.description).text || "No activity description"}</small>{splitSavedPhotos(d.description).photos.length > 0 && <div className="itinerary-saved-gallery">{splitSavedPhotos(d.description).photos.map((photo) => <img key={photo.id} src={photo.url} alt={photo.title} title={photo.title}/>)}</div>}</td><td><b>{d.travelPackage.title}</b><small>{d.travelPackage.referenceNo} · {d.travelPackage.customer.name}</small></td><td>{dateText(d.date)}</td><td>{[d.hotel?.split("\n")[0], d.meals].filter(Boolean).join(" · ") || "—"}</td><td><div className="workflow-actions"><button className="icon-button" title="Download full itinerary PDF" aria-label="Download full itinerary PDF" onClick={() => exportPackageItinerary(d.packageId)}><FileDown size={15}/></button><button className="icon-button" title="Edit itinerary day" onClick={() => start(d)}><Edit2 size={15}/></button><button className="icon-button danger-icon" title="Delete itinerary day" onClick={() => remove(d)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
      <div className="list-footer">Live database records <span>{filtered.length} shown</span></div>
    </section>
    {open && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><form className="customer-modal workflow-modal" onSubmit={save}>
      <div className="modal-heading"><div><h2>{editing ? "Edit itinerary day" : "Add itinerary day"}</h2><p>Save a day in a customer travel package.</p></div><button type="button" className="icon-button" onClick={close}><X size={20}/></button></div>{error && <div className="form-error">{error}</div>}
      <div className="customer-form-grid">
        <label className="wide-field">Travel package *<select required value={form.packageId} onChange={(e) => choosePackage(e.target.value)}><option value="">Select a package</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.referenceNo} · {p.title} · {p.customer.name}</option>)}</select></label>
        {selectedPackage && <div className="wide-field itinerary-package-summary">
          <b>Package details filled from TravelDesk</b>
          <p>{selectedPackage.customer.name} · {selectedPackage.destination || "Destination not set"} · {selectedPackage.adults ?? 1} adult(s), {selectedPackage.children ?? 0} child(ren)</p>
          <small>Travel: {dateText(selectedPackage.travelStart)} to {dateText(selectedPackage.travelEnd)}. Day dates are calculated from the package start date.</small>
          {selectedDateBookings.length > 0 ? <div className="itinerary-booking-summary"><b>Bookings on {dateText(form.date)}:</b>{selectedDateBookings.map((booking) => <small key={booking.id}>{booking.serviceType.replaceAll("_", " ")} · {booking.description}{booking.supplier?.name ? " · " + booking.supplier.name : ""}{booking.confirmationNo ? " · Ref " + booking.confirmationNo : ""}</small>)}</div> : <small>No bookings have a service date matching this day yet.</small>}
        </div>}
        <label>Day number *<input type="number" min="1" step="1" required value={form.dayNumber} onChange={(e) => changeDayNumber(e.target.value)}/></label>
        <label>Date<input type="date" value={form.date} onChange={(e) => changeItineraryDate(e.target.value)}/></label>
        <label className="wide-field">Day title *<input required value={form.title} onChange={(e) => { setField("title", e.target.value); setActivitySearch(e.target.value); }} placeholder="e.g. Arrive at Singapore airport"/></label>
        <div className="wide-field itinerary-assistant">
          <div><b>Free itinerary helper</b><small>Generate an editable day-plan draft, then use the destination search below to find real mapped places. The day-plan text uses free templates, not paid AI.</small></div>
          <button type="button" className="button button-secondary" onClick={generateDayPlan}>Generate day plan</button>
        </div>
        <label className="wide-field">Activities / description<textarea rows={5} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Your day plan will appear here. You can edit every line."/></label>
        <div className="wide-field assistant-search-panel">
          <div className="assistant-search-heading"><b>Nearby attractions & sightseeing ideas</b><small>TravelDesk looks up mapped places automatically when you choose a package. Leave the search blank to refresh destination suggestions, or type a specific landmark.</small></div>
          <div className="assistant-search-row"><input value={activitySearch} onChange={(e) => setActivitySearch(e.target.value)} placeholder="Leave blank for destination ideas, or enter a museum / landmark"/><button type="button" className="button button-secondary" disabled={placeLoading !== ""} onClick={() => searchPlaces("attraction")}>{placeLoading === "attraction" ? "Searching…" : "Find places"}</button></div>
          {activityPlaces.length > 0 && <div className="assistant-result-list">{activityPlaces.map((place) => <div className="assistant-place-result" key={place.id}><div><b>{place.name}</b><small>{place.address}</small><small>{place.category}</small><a href={place.mapUrl} target="_blank" rel="noreferrer">Open map</a></div><button type="button" className="button button-secondary" onClick={() => addActivityPlace(place)}>Add stop</button></div>)}</div>}
          <small>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.</small>
        </div>
        <label className="wide-field">Hotel / accommodation<textarea rows={3} value={form.hotel} onChange={(e) => setField("hotel", e.target.value)} placeholder="Enter the hotel name. Choose a result to add its address and contact details."/></label>
        <div className="wide-field assistant-search-panel">
          <div className="assistant-search-row"><div className="assistant-search-heading"><b>Find hotel details</b><small>Type a hotel name to look it up, or leave the field blank to discover mapped hotels near the package destination.</small></div><button type="button" className="button button-secondary" disabled={placeLoading !== ""} onClick={() => searchPlaces("hotel")}>{placeLoading === "hotel" ? "Searching…" : "Find hotel"}</button></div>
          {hotelPlaces.length > 0 && <div className="assistant-result-list">{hotelPlaces.map((place) => <div className="assistant-place-result" key={place.id}><div><b>{place.name}</b><small>{place.address}</small>{place.phone && <small>Phone: {place.phone}</small>}{place.website && <small><a href={place.website} target="_blank" rel="noreferrer">{place.website}</a></small>}<a href={place.mapUrl} target="_blank" rel="noreferrer">Open map · © OpenStreetMap</a></div><button type="button" className="button button-secondary" onClick={() => chooseHotel(place)}>Use hotel</button></div>)}</div>}
        </div>
        <div className="wide-field assistant-search-panel">
          <div className="assistant-search-row"><div className="assistant-search-heading"><b>Hotel and activity photos</b><small>Free Wikimedia Commons images. Check the suggested image is the correct place and retain its license credit.</small></div><button type="button" className="button button-secondary" disabled={photoLoading} onClick={() => searchPhotos(form.hotel.split("\n")[0].trim() || form.title || selectedPackage?.destination || "")}>{photoLoading ? "Searching…" : "Find photos"}</button></div>
          {assistantError && <p className="assistant-error">{assistantError}</p>}
          {assistantNotice && <p className="assistant-notice">{assistantNotice}</p>}
          {photos.length > 0 && <div className="assistant-photo-grid">{photos.map((photo) => {
            const chosen = selectedPhotos.some((item) => item.id === photo.id);
            return <div key={photo.id} className={"assistant-photo" + (chosen ? " selected" : "")}><button type="button" className="assistant-photo-select" onClick={() => togglePhoto(photo)}><img src={photo.url} alt={photo.title}/><span>{chosen ? "Selected" : "Add photo"}</span><b>{photo.title}</b><small>{photo.artist || "Author not listed"} · {photo.license}</small></button><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Source and license</a></div>;
          })}</div>}
          {selectedPhotos.length > 0 && <small>{selectedPhotos.length} photo(s) selected. Photo source and license details are saved with the day.</small>}
        </div>
        <label>Meals<input value={form.meals} onChange={(e) => setField("meals", e.target.value)} placeholder="Meals are entered manually (not stored on bookings yet)"/></label>
      </div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save itinerary day"}</button></div>
    </form></div>}
  </>;
}

type FinanceTab = "receipts" | "bills" | "payments";
const receiptBlank: FormState = { packageId: "", amount: "", currency: "INR", method: "BANK_TRANSFER", receivedAt: new Date().toISOString().slice(0, 10), reference: "", notes: "" };
const billBlank: FormState = { packageId: "", supplierId: "", supplierInvoiceNo: "", billDate: new Date().toISOString().slice(0, 10), dueDate: "", amount: "", taxAmount: "0", currency: "INR", notes: "" };
const paymentBlank: FormState = { supplierId: "", amount: "", currency: "INR", method: "BANK_TRANSFER", paidAt: new Date().toISOString().slice(0, 10), reference: "", notes: "" };

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
          <label>Supplier *<select required value={form.supplierId} onChange={(e)=>setField("supplierId",e.target.value)}><option value="">Select supplier</option>{suppliers.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Supplier invoice no.<input value={form.supplierInvoiceNo} onChange={(e)=>setField("supplierInvoiceNo",e.target.value)}/></label>
          <label>Bill date *<input type="date" required value={form.billDate} onChange={(e)=>setField("billDate",e.target.value)}/></label>
          <label>Due date<input type="date" value={form.dueDate} onChange={(e)=>setField("dueDate",e.target.value)}/></label>
          <label>Bill total *<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e)=>setField("amount",e.target.value)}/></label>
          <label>Tax amount<input type="number" min="0" step="0.01" value={form.taxAmount} onChange={(e)=>setField("taxAmount",e.target.value)}/></label>
          <label>Currency<input maxLength={3} value={form.currency} onChange={(e)=>setField("currency",e.target.value.toUpperCase())}/></label>
          <label className="wide-field">Notes<textarea rows={2} value={form.notes} onChange={(e)=>setField("notes",e.target.value)}/></label>
        </>}
        {tab === "payments" && <>
          <label>Supplier receiving payment *<select required value={form.supplierId} onChange={(e)=>setField("supplierId",e.target.value)}><option value="">Select supplier</option>{suppliers.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>\n          <label>Payment date<input type="date" value={form.paidAt} onChange={(e)=>setField("paidAt",e.target.value)}/></label>
          <label>Currency<input maxLength={3} value={form.currency} onChange={(e)=>{ setField("currency",e.target.value.toUpperCase()); setAllocations({}); }}/></label>
          <label>Payment amount *<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e)=>setField("amount",e.target.value)}/></label>
          <label>Payment method<select value={form.method} onChange={(e)=>setField("method",e.target.value)}>{methods.map((m)=><option key={m} value={m}>{methodLabel(m)}</option>)}</select></label>
          <label className="wide-field">Reference<input value={form.reference} onChange={(e)=>setField("reference",e.target.value)}/></label>
          <div className="wide-field finance-allocation-list"><b>Allocate to supplier bills</b><small>Only unpaid balances in the selected currency are shown. Remaining balance on a bill is calculated from earlier payments.</small>
            {openBills.filter((b)=>b.currency===form.currency && b.supplier.id===form.supplierId).map((b)=>{
              const paid=b.payments.reduce((s,p)=>s+Number(p.amount),0); const remaining=Math.max(0,Number(b.amount)-paid);
              return <label key={b.id} className="allocation-row"><span><b>{b.supplier.name} · {b.billNo}</b><small>{b.travelPackage.title} · Remaining {moneyText(remaining,b.currency)}</small></span><input type="number" min="0" max={remaining} step="0.01" placeholder="0.00" value={allocations[b.id]||""} onChange={(e)=>setAllocations((a)=>({...a,[b.id]:e.target.value}))}/></label>;
            })}
            {!openBills.some((b)=>b.currency===form.currency && b.supplier.id===form.supplierId) && <p className="allocation-empty">No outstanding bills in {form.currency}. Change currency or record a supplier bill first.</p>}
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
