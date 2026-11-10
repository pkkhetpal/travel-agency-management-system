import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOrNull, optionalText, wholeNumber } from "@/lib/workflow-utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    const days = await prisma.itineraryDay.findMany({
      where: { travelPackage: { companyId: session.companyId } },
      include: { travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } } },
      orderBy: [{ packageId: "asc" }, { dayNumber: "asc" }],
      take: 1000,
    });
    const packages = await prisma.travelPackage.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true, title: true, referenceNo: true, travelStart: true, travelEnd: true,
        destination: true, adults: true, children: true,
        customer: { select: { name: true } },
        bookings: {
          select: {
            id: true, serviceType: true, description: true, serviceDate: true,
            confirmationNo: true, status: true, supplier: { select: { name: true } },
          },
          orderBy: { serviceDate: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 250,
    });
    return NextResponse.json({ days, packages });
  } catch {
    return NextResponse.json({ error: "Please sign in to view itineraries." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const packageId = String(body.packageId || "").trim();
    const title = String(body.title || "").trim();
    if (!packageId) return NextResponse.json({ error: "Choose a travel package." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Enter a title for this itinerary day." }, { status: 400 });
    const dayNumber = wholeNumber(body.dayNumber, "Day number", 1, 1);
    const travelPackage = await prisma.travelPackage.findFirst({ where: { id: packageId, companyId: session.companyId }, select: { id: true } });
    if (!travelPackage) return NextResponse.json({ error: "The selected package was not found in your agency." }, { status: 400 });
    const day = await prisma.itineraryDay.create({
      data: { packageId, dayNumber, date: dateOrNull(body.date, "Itinerary date"), title, description: optionalText(body.description), hotel: optionalText(body.hotel), meals: optionalText(body.meals) },
      include: { travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } } },
    });
    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save itinerary day.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("Unique constraint") ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "That package already has an itinerary entry for this day number." : message }, { status });
  }
}
