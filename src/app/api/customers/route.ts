import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    const customers = await prisma.customer.findMany({
      where: {
        companyId: session.companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { mobile: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ customers });
  } catch {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.create({
      data: {
        companyId: session.companyId,
        name,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        mobile: body.mobile ? String(body.mobile).trim() : null,
        alternateMobile: body.alternateMobile
          ? String(body.alternateMobile).trim()
          : null,
        address: body.address ? String(body.address).trim() : null,
        city: body.city ? String(body.city).trim() : null,
        state: body.state ? String(body.state).trim() : null,
        country: body.country ? String(body.country).trim() : "India",
        notes: body.notes ? String(body.notes).trim() : null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not save customer. Please sign in and try again." },
      { status: 401 },
    );
  }
}
