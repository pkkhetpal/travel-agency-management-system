import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { dateOrNull, optionalText, wholeNumber } from "@/lib/workflow-utils";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const existing = await prisma.itineraryDay.findFirst({ where: { id: params.id, travelPackage: { companyId: session.companyId } }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Itinerary day not found." }, { status: 404 });
    const body = await request.json();
    const packageId = String(body.packageId || "").trim();
    const title = String(body.title || "").trim();
    if (!packageId) return NextResponse.json({ error: "Choose a travel package." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Enter a title for this itinerary day." }, { status: 400 });
    const dayNumber = wholeNumber(body.dayNumber, "Day number", 1, 1);
    const travelPackage = await prisma.travelPackage.findFirst({ where: { id: packageId, companyId: session.companyId }, select: { id: true } });
    if (!travelPackage) return NextResponse.json({ error: "The selected package was not found in your agency." }, { status: 400 });
    const day = await prisma.itineraryDay.update({
      where: { id: params.id },
      data: { packageId, dayNumber, date: dateOrNull(body.date, "Itinerary date"), title, description: optionalText(body.description), hotel: optionalText(body.hotel), meals: optionalText(body.meals) },
      include: { travelPackage: { select: { id: true, title: true, referenceNo: true, customer: { select: { name: true } } } } },
    });
    return NextResponse.json({ day });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update itinerary day.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("Unique constraint") ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? "That package already has an itinerary entry for this day number." : message }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const day = await prisma.itineraryDay.findFirst({ where: { id: params.id, travelPackage: { companyId: session.companyId } }, select: { id: true } });
    if (!day) return NextResponse.json({ error: "Itinerary day not found." }, { status: 404 });
    await prisma.itineraryDay.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete itinerary day." }, { status: 400 });
  }
}
