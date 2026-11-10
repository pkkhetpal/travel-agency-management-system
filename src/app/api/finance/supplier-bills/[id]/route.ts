import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const bill = await prisma.supplierBill.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: { payments: { select: { id: true } } },
    });
    if (!bill) return NextResponse.json({ error: "Supplier bill not found." }, { status: 404 });
    if (bill.status === "VOID") return NextResponse.json({ error: "This bill is already void." }, { status: 409 });
    if (bill.payments.length) return NextResponse.json({ error: "This bill has payment allocations. It cannot be voided while payments are linked." }, { status: 409 });
    const updated = await prisma.supplierBill.update({ where: { id: params.id }, data: { status: "VOID" }, select: { id: true, billNo: true, status: true } });
    return NextResponse.json({ bill: updated });
  } catch {
    return NextResponse.json({ error: "Could not void this supplier bill." }, { status: 400 });
  }
}
