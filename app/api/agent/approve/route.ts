import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyEnvelope, signPayload } from "@/lib/ap2/sign";
import { HUMAN_PRIVATE_KEY_PEM, HUMAN_PUBLIC_KEY_PEM } from "@/lib/ap2/human-keys";
import { SignedEnvelope, IntentMandate, CartMandate, CartApproval } from "@/lib/ap2/types";

export async function POST(req: NextRequest) {
  const {
    intentEnvelope,
    cartEnvelope,
    approvalMethod,
  }: {
    intentEnvelope: SignedEnvelope<IntentMandate>;
    cartEnvelope: SignedEnvelope<CartMandate>;
    approvalMethod: "human-click" | "auto-approved-within-budget";
  } = await req.json();

  if (!verifyEnvelope(intentEnvelope)) {
    return NextResponse.json({ error: "invalid Intent Mandate signature" }, { status: 400 });
  }
  if (!verifyEnvelope(cartEnvelope)) {
    return NextResponse.json({ error: "invalid Cart Mandate signature" }, { status: 400 });
  }
  if (cartEnvelope.payload.intentMandateId !== intentEnvelope.payload.id) {
    return NextResponse.json({ error: "cart does not reference the given intent" }, { status: 400 });
  }
  if (new Date(cartEnvelope.payload.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Cart Mandate has expired" }, { status: 400 });
  }
  if (cartEnvelope.payload.totalCents > intentEnvelope.payload.constraints.maxAmountCents) {
    return NextResponse.json({ error: "cart total exceeds the intent's budget" }, { status: 400 });
  }

  const mandate: CartApproval = {
    type: "CartApproval",
    id: randomUUID(),
    cartMandateId: cartEnvelope.payload.id,
    intentMandateId: intentEnvelope.payload.id,
    approvedTotalCents: cartEnvelope.payload.totalCents,
    currency: "THB",
    approvalMethod,
    createdAt: new Date().toISOString(),
  };

  const envelope = signPayload(mandate, HUMAN_PRIVATE_KEY_PEM, HUMAN_PUBLIC_KEY_PEM);
  return NextResponse.json(envelope);
}
