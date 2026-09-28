/**
 * In-memory order ledger, keyed by Stripe PaymentIntent id. A real
 * deployment persists this in a database — kept in-memory here so the
 * lesson stays focused on the reconciliation pattern (synchronous
 * confirmation vs. async webhook truth) rather than schema/migrations.
 * State resets whenever the Next.js dev server restarts.
 */
export type OrderStatus = "pending_confirmation" | "succeeded" | "failed" | "disputed";

export type OrderEvent = {
  source: "sync-response" | "webhook";
  type: string;
  receivedAt: string;
};

export type Order = {
  paymentIntentId: string;
  intentMandateId: string;
  cartMandateId: string;
  cartApprovalId: string;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
};

const orders = new Map<string, Order>();

export function createOrder(order: Omit<Order, "events" | "updatedAt">): Order {
  const full: Order = { ...order, updatedAt: order.createdAt, events: [] };
  orders.set(order.paymentIntentId, full);
  return full;
}

export function getOrder(paymentIntentId: string): Order | undefined {
  return orders.get(paymentIntentId);
}

export function appendOrderEvent(
  paymentIntentId: string,
  status: OrderStatus,
  event: Omit<OrderEvent, "receivedAt">
): Order | undefined {
  const order = orders.get(paymentIntentId);
  if (!order) return undefined;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  order.events.push({ ...event, receivedAt: order.updatedAt });
  return order;
}
