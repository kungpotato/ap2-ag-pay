const CART_KEY = "ap2-bookshop-cart";

export type CartLine = { bookId: string; qty: number };

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

export function addToCart(bookId: string): CartLine[] {
  const lines = readCart();
  const existing = lines.find((l) => l.bookId === bookId);
  if (existing) {
    existing.qty += 1;
  } else {
    lines.push({ bookId, qty: 1 });
  }
  writeCart(lines);
  return lines;
}

export function removeFromCart(bookId: string): CartLine[] {
  const lines = readCart().filter((l) => l.bookId !== bookId);
  writeCart(lines);
  return lines;
}
