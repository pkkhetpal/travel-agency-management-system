import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const receipt = await prisma.customerReceipt.findFirst({ where: { id: params.id, companyId: session.companyId }, select: { id: true, status: true } });
    if (!receipt) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    if (receipt.status === "VOID") return NextResponse.json({ error: "This receipt is already void." }, { status: 409 });
    const updated = await prisma.customerReceipt.update({ where: { id: params.id }, data: { status: "VOID" }, select: { id: true, receiptNo: true, status: true } });
    return NextResponse.json({ receipt: updated });
  } catch {
    return NextResponse.json({ error: "Could not void this receipt." }, { status: 400 });
  }
}
