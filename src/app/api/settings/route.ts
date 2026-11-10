import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

function clean(value: unknown) {
  const result = String(value ?? "").trim();
  return result || null;
}

function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const session = await requireSession();
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: {
        id: true, name: true, legalName: true, email: true, phone: true,
        gstin: true, baseCurrency: true, timezone: true, address: true,
      },
    });
    if (!company) return NextResponse.json({ error: "Agency profile not found." }, { status: 404 });
    return NextResponse.json({ company, canEdit: ["OWNER", "ADMIN"].includes(session.role) });
  } catch {
    return NextResponse.json({ error: "Please sign in to view agency settings." }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    if (!["OWNER", "ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Only an agency owner or administrator can change agency settings." }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const baseCurrency = String(body.baseCurrency || "INR").trim().toUpperCase();
    const timezone = String(body.timezone || "Asia/Kolkata").trim();
    const email = clean(body.email)?.toLowerCase() ?? null;
    const gstin = clean(body.gstin)?.toUpperCase() ?? null;

    if (!name) return NextResponse.json({ error: "Agency name is required." }, { status: 400 });
    if (name.length > 160) return NextResponse.json({ error: "Agency name is too long." }, { status: 400 });
    if (!/^[A-Z]{3}$/.test(baseCurrency)) return NextResponse.json({ error: "Enter a valid 3-letter default currency code." }, { status: 400 });
    if (!validTimeZone(timezone)) return NextResponse.json({ error: "Choose a valid time zone." }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid agency email address." }, { status: 400 });
    if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) return NextResponse.json({ error: "GSTIN must contain 15 letters and numbers." }, { status: 400 });

    const company = await prisma.company.update({
      where: { id: session.companyId },
      data: {
        name,
        legalName: clean(body.legalName),
        email,
        phone: clean(body.phone),
        gstin,
        baseCurrency,
        timezone,
        address: clean(body.address),
      },
      select: {
        id: true, name: true, legalName: true, email: true, phone: true,
        gstin: true, baseCurrency: true, timezone: true, address: true,
      },
    });
    return NextResponse.json({ company });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save agency settings.";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Please sign in." : "Could not save agency settings. Please try again." }, { status: message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
