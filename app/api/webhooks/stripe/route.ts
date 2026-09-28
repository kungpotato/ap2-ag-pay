import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { appendOrderEvent } from "@/lib/orderStore";

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const status = event.type === "payment_intent.succeeded" ? "succeeded" : "failed";
    const updated = appendOrderEvent(paymentIntent.id, status, { source: "webhook", type: event.type });
    if (!updated) {
      // Event for a PaymentIntent this app didn't create the order for —
      // log and ignore rather than fail the webhook (Stripe will retry).
      console.warn(`webhook for unknown order: ${paymentIntent.id}`);
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId =
      typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
    if (paymentIntentId) {
      appendOrderEvent(paymentIntentId, "disputed", { source: "webhook", type: event.type });
    }
  }

  return NextResponse.json({ received: true });
}
