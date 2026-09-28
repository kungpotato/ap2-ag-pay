import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import { signPayload } from "@/lib/ap2/sign";
import { verifyEnvelopeRemote } from "@/lib/ap2/verifyRemote";
import { MERCHANT_PRIVATE_KEY_PEM, MERCHANT_PUBLIC_KEY_PEM } from "@/lib/ap2/merchant-keys";
import { getStripeClient } from "@/lib/stripe";
import { SignedEnvelope, IntentMandate, CartMandate, CartApproval, PaymentMandate } from "@/lib/ap2/types";

export async function POST(req: NextRequest) {
  const {
    intentEnvelope,
    cartEnvelope,
    approvalEnvelope,
  }: {
    intentEnvelope: SignedEnvelope<IntentMandate>;
    cartEnvelope: SignedEnvelope<CartMandate>;
    approvalEnvelope: SignedEnvelope<CartApproval>;
  } = await req.json();

  const intentCheck = await verifyEnvelopeRemote(intentEnvelope);
  if (!intentCheck.ok) {
    return NextResponse.json(
      { error: `remote verifier rejected Intent Mandate: ${intentCheck.reason ?? "invalid signature"}` },
      { status: 400 }
    );
  }
  const cartCheck = await verifyEnvelopeRemote(cartEnvelope);
  if (!cartCheck.ok) {
    return NextResponse.json(
      { error: `remote verifier rejected Cart Mandate: ${cartCheck.reason ?? "invalid signature"}` },
      { status: 400 }
    );
  }
  const approvalCheck = await verifyEnvelopeRemote(approvalEnvelope);
  if (!approvalCheck.ok) {
    return NextResponse.json(
      { error: `remote verifier rejected Cart Approval: ${approvalCheck.reason ?? "invalid signature"}` },
      { status: 400 }
    );
  }
  if (cartEnvelope.payload.intentMandateId !== intentEnvelope.payload.id) {
    return NextResponse.json({ error: "cart does not reference the given intent" }, { status: 400 });
  }
  if (approvalEnvelope.payload.cartMandateId !== cartEnvelope.payload.id) {
    return NextResponse.json({ error: "approval does not reference the given cart" }, { status: 400 });
  }
  if (approvalEnvelope.payload.approvedTotalCents !== cartEnvelope.payload.totalCents) {
    return NextResponse.json({ error: "approved amount does not match cart total" }, { status: 400 });
  }
  if (new Date(cartEnvelope.payload.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Cart Mandate has expired" }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured — set STRIPE_SECRET_KEY in .env to enable settlement" },
      { status: 503 }
    );
  }

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: cartEnvelope.payload.totalCents,
      currency: "thb",
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        intentMandateId: intentEnvelope.payload.id,
        cartMandateId: cartEnvelope.payload.id,
        cartApprovalId: approvalEnvelope.payload.id,
      },
    });
  } catch (err) {
    const message = err instanceof Stripe.errors.StripeError ? err.message : "unexpected Stripe error";
    return NextResponse.json({ error: `Stripe rejected the payment: ${message}` }, { status: 502 });
  }

  const mandate: PaymentMandate = {
    type: "PaymentMandate",
    id: randomUUID(),
    cartMandateId: cartEnvelope.payload.id,
    cartApprovalId: approvalEnvelope.payload.id,
    intentMandateId: intentEnvelope.payload.id,
    amountCents: cartEnvelope.payload.totalCents,
    currency: "THB",
    paymentProvider: "stripe",
    paymentIntentId: paymentIntent.id,
    paymentIntentStatus: paymentIntent.status,
    createdAt: new Date().toISOString(),
  };

  const envelope = signPayload(mandate, MERCHANT_PRIVATE_KEY_PEM, MERCHANT_PUBLIC_KEY_PEM);
  return NextResponse.json(envelope);
}
