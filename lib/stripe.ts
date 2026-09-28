import Stripe from "stripe";

let client: Stripe | null | undefined;

/** Lazily constructs a Stripe client from STRIPE_SECRET_KEY, or null if unset. */
export function getStripeClient(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  client = key ? new Stripe(key) : null;
  return client;
}
