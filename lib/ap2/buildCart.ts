import { catalog } from "@/lib/catalog";
import { CartItem, IntentMandate } from "./types";

/**
 * Greedy cheapest-first fill: pick books matching the intent's keywords
 * (or category, or anything if neither is set), cheapest first, stopping
 * once adding the next one would exceed the intent's budget. Deterministic
 * so the same intent always produces the same cart.
 */
export function buildCartFromIntent(intent: IntentMandate): CartItem[] {
  const { keywords, category, maxAmountCents } = intent.constraints;

  const candidates = catalog.filter((book) => {
    if (keywords.length > 0) return keywords.includes(book.id);
    if (category) return book.category.toLowerCase() === category.toLowerCase();
    return true;
  });

  const sorted = [...candidates].sort((a, b) => a.priceCents - b.priceCents);

  const items: CartItem[] = [];
  let total = 0;
  for (const book of sorted) {
    if (total + book.priceCents > maxAmountCents) continue;
    items.push({ bookId: book.id, title: book.title, unitPriceCents: book.priceCents, qty: 1 });
    total += book.priceCents;
  }
  return items;
}
