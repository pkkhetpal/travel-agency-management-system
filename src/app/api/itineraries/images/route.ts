import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommonsMeta = { value?: string };
type CommonsImage = {
  title: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, CommonsMeta>;
  }>;
};

function plainText(value: string | undefined) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const query = (url.searchParams.get("query") || "").trim().slice(0, 140);
    const destination = (url.searchParams.get("destination") || "").trim().slice(0, 100);
    if (query.length < 3) return NextResponse.json({ error: "Enter at least 3 letters to search for photos." }, { status: 400 });

    const search = [query, destination].filter(Boolean).join(" ");
    const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
    endpoint.search = new URLSearchParams({
      action: "query", format: "json", generator: "search",
      gsrsearch: search, gsrnamespace: "6", gsrlimit: "8",
      prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "760",
    }).toString();

    const response = await fetch(endpoint, {
      headers: { "User-Agent": "TravelDesk/0.2 (travel agency itinerary photo suggestions)" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return NextResponse.json({ error: "The free photo library is temporarily unavailable." }, { status: 502 });
    const data = await response.json() as { query?: { pages?: Record<string, CommonsImage> } };
    const photos = Object.values(data.query?.pages || {}).flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return [];
      const meta = info.extmetadata || {};
      const imageUrl = info.thumburl || info.url;
      if (!imageUrl || !info.descriptionurl) return [];
      return [{
        id: page.title,
        title: page.title.replace(/^File:/, ""),
        url: imageUrl,
        sourceUrl: info.descriptionurl,
        artist: plainText(meta.Artist?.value || meta.Credit?.value || ""),
        license: plainText(meta.LicenseShortName?.value || "See source page"),
        licenseUrl: plainText(meta.LicenseUrl?.value || info.descriptionurl),
      }];
    });
    return NextResponse.json({ photos, attribution: "Images from Wikimedia Commons. Check each file's license and attribution before publishing." });
  } catch (error) {
    const message = error instanceof Error && error.message === "UNAUTHENTICATED"
      ? "Please sign in to search photos."
      : "Could not search photos right now. Please try again.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Please sign in") ? 401 : 502 });
  }
}
