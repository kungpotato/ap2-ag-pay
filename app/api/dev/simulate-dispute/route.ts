import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { getOrder } from "@/lib/orderStore";

/**
 * DEV-ONLY: simulates a `charge.dispute.created` webhook for a real order in
 * this app, without needing an actual Stripe dispute (which requires a real
 * disputed charge — not something you can trigger on demand in test mode
 * against a specific PaymentIntent). It builds a synthetic event payload and
 * signs it with the real STRIPE_WEBHOOK_SECRET via Stripe's own test-header
 * helper, then POSTs it to our own webhook route — so the signature check
 * and dispute handling that run are the real code paths, not a shortcut.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const { paymentIntentId }: { paymentIntentId?: string } = await req.json();
  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });
  }

  const order = getOrder(paymentIntentId);
  if (!order) {
    return NextResponse.json({ error: "no order found for that PaymentIntent" }, { status: 404 });
  }
  if (order.status !== "succeeded") {
    return NextResponse.json({ error: "only a succeeded order can be disputed" }, { status: 400 });
  }

  const fakeEvent = {
    id: `evt_sim_${Date.now()}`,
    object: "event",
    type: "charge.dispute.created",
    data: {
      object: {
        id: `dp_sim_${Date.now()}`,
        object: "dispute",
        amount: order.amountCents,
        currency: order.currency.toLowerCase(),
        payment_intent: paymentIntentId,
        reason: "fraudulent",
        status: "warning_needs_response",
      },
    },
  };

  const payload = JSON.stringify(fakeEvent);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

  const res = await fetch(new URL("/api/webhooks/stripe", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signature },
    body: payload,
  });

  return NextResponse.json({ forwarded: true, webhookStatus: res.status }, { status: res.ok ? 200 : 502 });
}
