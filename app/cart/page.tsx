"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { findBook, formatTHB } from "@/lib/catalog";
import { addToCart, readCart, removeFromCart, CartLine } from "@/lib/cart";

export default function CartPage() {
  return (
    <Suspense>
      <CartView />
    </Suspense>
  );
}

function CartView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lines, setLines] = useState<CartLine[]>([]);
  const addedRef = useRef<string | null>(null);

  useEffect(() => {
    const toAdd = searchParams.get("add");
    if (toAdd && addedRef.current !== toAdd) {
      addedRef.current = toAdd;
      setLines(addToCart(toAdd));
      router.replace("/cart");
      return;
    }
    if (!toAdd) {
      setLines(readCart());
    }
  }, [searchParams, router]);

  const items = lines
    .map((line) => ({ line, book: findBook(line.bookId) }))
    .filter((entry): entry is { line: CartLine; book: NonNullable<ReturnType<typeof findBook>> } => Boolean(entry.book));

  const totalCents = items.reduce((sum, { line, book }) => sum + book.priceCents * line.qty, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/10 dark:border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium underline">
          ← Back to shop
        </Link>
        <h1 className="text-xl font-semibold">🛒 Cart</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-4">
        {items.length === 0 && <p className="text-zinc-500">Your cart is empty.</p>}
        {items.map(({ line, book }) => (
          <div
            key={book.id}
            className="flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{book.coverEmoji}</span>
              <div>
                <p className="font-medium">{book.title}</p>
                <p className="text-sm text-zinc-500">
                  {formatTHB(book.priceCents)} × {line.qty}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLines(removeFromCart(book.id))}
              className="text-sm text-red-600 underline"
            >
              Remove
            </button>
          </div>
        ))}
        {items.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{formatTHB(totalCents)}</span>
          </div>
        )}
        <button
          disabled={items.length === 0}
          className="mt-4 rounded-full bg-black text-white dark:bg-white dark:text-black py-2.5 font-medium disabled:opacity-40"
        >
          Checkout (manual, no agent yet)
        </button>
      </main>
    </div>
  );
}
