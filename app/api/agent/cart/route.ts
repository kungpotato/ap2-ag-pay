import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyEnvelope, signPayload } from "@/lib/ap2/sign";
import { buildCartFromIntent } from "@/lib/ap2/buildCart";
import { MERCHANT_PRIVATE_KEY_PEM, MERCHANT_PUBLIC_KEY_PEM } from "@/lib/ap2/merchant-keys";
import { SignedEnvelope, IntentMandate, CartMandate } from "@/lib/ap2/types";

const CART_TTL_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const intentEnvelope: SignedEnvelope<IntentMandate> = await req.json();

  if (!verifyEnvelope(intentEnvelope)) {
    return NextResponse.json({ error: "invalid Intent Mandate signature" }, { status: 400 });
  }
  if (intentEnvelope.payload.type !== "IntentMandate") {
    return NextResponse.json({ error: "expected an IntentMandate envelope" }, { status: 400 });
  }
  if (new Date(intentEnvelope.payload.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Intent Mandate has expired" }, { status: 400 });
  }

  const items = buildCartFromIntent(intentEnvelope.payload);
  if (items.length === 0) {
    return NextResponse.json({ error: "no catalog items match the intent within budget" }, { status: 422 });
  }

  const now = new Date();
  const mandate: CartMandate = {
    type: "CartMandate",
    id: randomUUID(),
    intentMandateId: intentEnvelope.payload.id,
    merchantId: "ap2-bookshop",
    items,
    totalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0),
    currency: "THB",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CART_TTL_MS).toISOString(),
  };

  const envelope = signPayload(mandate, MERCHANT_PRIVATE_KEY_PEM, MERCHANT_PUBLIC_KEY_PEM);
  return NextResponse.json(envelope);
}
