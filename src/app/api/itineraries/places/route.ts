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
  boundingbox?: string[];
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
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

function tagAddress(tags: Record<string, string>, destination: string) {
  const fields = [
    tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
    tags["addr:state"], tags["addr:postcode"], tags["addr:country"],
  ].filter(Boolean);
  return fields.length ? [...new Set(fields)].join(", ") : destination + " area (exact street address not listed)";
}

function categoryLabel(tags: Record<string, string>, kind: "hotel" | "attraction") {
  const raw = tags.tourism || tags.historic || tags.leisure || tags.natural || tags.amenity || tags.building || "";
  const labels: Record<string, string> = {
    attraction: "Attraction", museum: "Museum", gallery: "Gallery",
    theme_park: "Theme park", zoo: "Zoo", aquarium: "Aquarium",
    viewpoint: "Viewpoint", artwork: "Artwork", hotel: "Hotel",
    hostel: "Hostel", guest_house: "Guest house", motel: "Motel",
    apartment: "Apartment stay", chalet: "Chalet", park: "Park",
    garden: "Garden", nature_reserve: "Nature reserve", beach: "Beach",
    peak: "Peak", waterfall: "Waterfall", place_of_worship: "Place of worship",
    theatre: "Theatre", arts_centre: "Arts centre", castle: "Castle",
    archaeological_site: "Historic site", monument: "Monument",
    memorial: "Memorial", ruins: "Historic ruins", fort: "Fort",
  };
  return labels[raw] || (kind === "hotel" ? "Accommodation" : "Place to visit");
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const value = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function geocodeDestination(destination: string) {
  await waitForNominatimSlot();
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.search = new URLSearchParams({
    q: destination,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    dedupe: "1",
  }).toString();

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "TravelDesk/0.2 (travel agency itinerary place lookup)",
      "Accept-Language": "en",
    },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(response.status === 403 || response.status === 429
      ? "The shared free map search is temporarily limiting requests. Please wait a little and try again."
      : "The free map search could not locate this destination right now.");
  }
  const items = await response.json() as NominatimItem[];
  const item = items[0];
  if (!item || !Number.isFinite(Number(item.lat)) || !Number.isFinite(Number(item.lon))) {
    throw new Error("We could not locate this destination on the free map. Add a city and country, for example “Jaipur, India”.");
  }
  return {
    lat: Number(item.lat),
    lon: Number(item.lon),
    label: buildAddress(item.address, item.display_name),
  };
}

async function discoverMappedPlaces(destination: string, kind: "hotel" | "attraction") {
  const center = await geocodeDestination(destination);
  const around = "around:6500," + center.lat + "," + center.lon;
  const selectors = kind === "hotel"
    ? [
        'nwr(' + around + ')["name"]["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet)$"];',
      ]
    : [
        'nwr(' + around + ')["name"]["tourism"~"^(attraction|museum|gallery|theme_park|zoo|aquarium|viewpoint|artwork)$"];',
        'nwr(' + around + ')["name"]["historic"];',
        'nwr(' + around + ')["name"]["leisure"~"^(park|garden|nature_reserve)$"];',
        'nwr(' + around + ')["name"]["natural"~"^(beach|peak|waterfall)$"];',
        'nwr(' + around + ')["name"]["amenity"~"^(place_of_worship|theatre|arts_centre)$"];',
      ];

  const query = "[out:json][timeout:18];(" + selectors.join("") + ");out center tags 45;";
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "TravelDesk/0.2 (travel agency itinerary place lookup)",
    },
    body: new URLSearchParams({ data: query }).toString(),
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(22000),
  });

  if (!response.ok) {
    throw new Error(response.status === 429 || response.status === 504
      ? "The free map service is busy right now. Please try the search again shortly."
      : "Nearby place discovery is temporarily unavailable. You can still search for a specific place by name.");
  }

  const data = await response.json() as { elements?: OverpassElement[]; remark?: string };
  if (data.remark) {
    throw new Error("The free map service could not complete this nearby search. Please try again in a moment.");
  }

  const elements = data.elements || [];
  const places = elements.flatMap((element) => {
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const name = tags.name || tags["name:en"];
    if (!name || typeof lat !== "number" || typeof lon !== "number") return [];
    const address = tagAddress(tags, center.label || destination);
    const phone = tags["contact:phone"] || tags.phone || tags["contact:mobile"] || "";
    const website = tags["contact:website"] || tags.website || "";
    const mapUrl = "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lon + "#map=17/" + lat + "/" + lon;
    return [{
      id: element.type + "-" + element.id,
      name,
      address,
      phone,
      website,
      category: categoryLabel(tags, kind),
      latitude: lat,
      longitude: lon,
      mapUrl,
      source: "OpenStreetMap",
      kind,
      distanceKm: haversineKm(center.lat, center.lon, lat, lon),
    }];
  });

  const unique = Array.from(new Map(places.map((place) => [place.id, place])).values())
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 30)
    .map(({ distanceKm, ...place }) => place);

  return {
    places: unique,
    center: { latitude: center.lat, longitude: center.lon, label: center.label },
  };
}

async function searchNamedPlaces(query: string, destination: string, kind: "hotel" | "attraction") {
  await waitForNominatimSlot();
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.search = new URLSearchParams({
    q: [query, destination].filter(Boolean).join(", "),
    format: "jsonv2",
    addressdetails: "1",
    extratags: "1",
    namedetails: "1",
    limit: "7",
  }).toString();

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "TravelDesk/0.2 (travel agency itinerary place lookup)",
      "Accept-Language": "en",
    },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(response.status === 403 || response.status === 429
      ? "The shared free map search is temporarily limiting requests. Please wait a little and try again."
      : "The free map search is temporarily unavailable. Please try again later.");
  }
  const items = await response.json() as NominatimItem[];
  const places = items.map((item) => {
    const tags = item.extratags || {};
    const name = item.name || item.namedetails?.name || item.display_name.split(",")[0];
    return {
      id: String(item.osm_type) + "-" + String(item.osm_id),
      name,
      address: buildAddress(item.address, item.display_name),
      phone: tags["contact:phone"] || tags.phone || tags["contact:mobile"] || "",
      website: tags["contact:website"] || tags.website || "",
      category: [item.category, item.type].filter(Boolean).join(" · ") || categoryLabel(tags, kind),
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      mapUrl: "https://www.openstreetmap.org/?mlat=" + item.lat + "&mlon=" + item.lon + "#map=17/" + item.lat + "/" + item.lon,
      source: "OpenStreetMap",
      kind,
    };
  });
  return { places };
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const query = (url.searchParams.get("query") || "").trim().slice(0, 140);
    const destination = (url.searchParams.get("destination") || "").trim().slice(0, 100);
    const kind = url.searchParams.get("kind") === "hotel" ? "hotel" : "attraction";
    const discover = url.searchParams.get("discover") === "1";

    if (discover || !query) {
      if (destination.length < 2) {
        return NextResponse.json({ error: "Add a destination to the travel package before discovering nearby places." }, { status: 400 });
      }
      const result = await discoverMappedPlaces(destination, kind);
      return NextResponse.json({
        ...result,
        attribution: "© OpenStreetMap contributors",
        licenseUrl: "https://www.openstreetmap.org/copyright",
        discoveryRadiusKm: 6.5,
        notice: "Places shown are community-mapped suggestions. Opening hours, availability, addresses and service details may be incomplete. They are not confirmed tours or bookings.",
      });
    }

    if (query.length < 3) {
      return NextResponse.json({ error: "Enter at least 3 letters to search." }, { status: 400 });
    }
    const result = await searchNamedPlaces(query, destination, kind);
    return NextResponse.json({
      ...result,
      attribution: "© OpenStreetMap contributors",
      licenseUrl: "https://www.openstreetmap.org/copyright",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Please sign in to search places." }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not search places right now. Please try again.";
    const status = /temporarily|busy|limiting|try again|could not locate/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
