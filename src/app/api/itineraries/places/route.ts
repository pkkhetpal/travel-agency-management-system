import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NominatimItem = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
};

let lastNominatimRequestAt = 0;
let nominatimQueue: Promise<void> = Promise.resolve();

async function waitForNominatimSlot() {
  const next = nominatimQueue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimRequestAt = Date.now();
  });
  nominatimQueue = next.catch(() => undefined);
  await next;
}

function buildAddress(address: Record<string, string> | undefined, fallback: string) {
  if (!address) return fallback;
  const fields = [
    address.house_number, address.road, address.neighbourhood, address.suburb,
    address.city || address.town || address.village || address.municipality,
    address.state, address.postcode, address.country,
  ].filter(Boolean);
  return fields.length ? [...new Set(fields)].join(", ") : fallback;
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const query = (url.searchParams.get("query") || "").trim().slice(0, 140);
    const destination = (url.searchParams.get("destination") || "").trim().slice(0, 100);
    const kind = url.searchParams.get("kind") === "hotel" ? "hotel" : "attraction";
    if (query.length < 3) return NextResponse.json({ error: "Enter at least 3 letters to search." }, { status: 400 });

    const searchText = [query, destination].filter(Boolean).join(", ");
    const endpoint = new URL("https://nominatim.openstreetmap.org/search");
    endpoint.search = new URLSearchParams({
      q: searchText, format: "jsonv2", addressdetails: "1", extratags: "1",
      namedetails: "1", limit: "7",
    }).toString();

    await waitForNominatimSlot();
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "TravelDesk/0.2 (travel agency itinerary place lookup)",
        "Accept-Language": "en",
      },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return NextResponse.json({ error: "The free map search is temporarily unavailable. Please try again later." }, { status: 502 });
    const items = await response.json() as NominatimItem[];
    const places = items.map((item) => {
      const tags = item.extratags || {};
      const name = item.name || item.namedetails?.name || item.display_name.split(",")[0];
      const address = buildAddress(item.address, item.display_name);
      const phone = tags["contact:phone"] || tags.phone || tags["contact:mobile"] || "";
      const website = tags["contact:website"] || tags.website || "";
      return {
        id: String(item.osm_type) + "-" + String(item.osm_id),
        name, address, phone, website,
        category: [item.category, item.type].filter(Boolean).join(" · "),
        latitude: Number(item.lat), longitude: Number(item.lon),
        mapUrl: "https://www.openstreetmap.org/?mlat=" + item.lat + "&mlon=" + item.lon + "#map=17/" + item.lat + "/" + item.lon,
        source: "OpenStreetMap",
        kind,
      };
    });
    return NextResponse.json({ places, attribution: "© OpenStreetMap contributors", licenseUrl: "https://www.openstreetmap.org/copyright" });
  } catch (error) {
    const message = error instanceof Error && error.message === "UNAUTHENTICATED"
      ? "Please sign in to search places."
      : "Could not search places right now. Please try again.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Please sign in") ? 401 : 502 });
  }
}
