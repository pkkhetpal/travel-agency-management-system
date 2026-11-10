import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { name: true, baseCurrency: true, timezone: true },
  });
  return NextResponse.json({
    user: { name: user.name, role: user.role, email: user.email },
    company,
  });
}
