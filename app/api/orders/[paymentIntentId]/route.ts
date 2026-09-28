import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orderStore";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ paymentIntentId: string }> }) {
  const { paymentIntentId } = await params;
  const order = getOrder(paymentIntentId);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}
