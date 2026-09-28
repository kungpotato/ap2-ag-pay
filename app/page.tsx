import Link from "next/link";
import { catalog, formatTHB } from "@/lib/catalog";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/10 dark:border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">📚 AP2 Bookshop</h1>
        <div className="flex items-center gap-4">
          <Link href="/agent" className="text-sm font-medium underline">
            🤖 Shopping agent
          </Link>
          <Link href="/cart" className="text-sm font-medium underline">
            Cart
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalog.map((book) => (
            <div
              key={book.id}
              className="rounded-xl border border-black/10 dark:border-white/10 p-5 flex flex-col gap-2 bg-white dark:bg-zinc-900"
            >
              <div className="text-4xl">{book.coverEmoji}</div>
              <h2 className="font-semibold leading-tight">{book.title}</h2>
              <p className="text-sm text-zinc-500">{book.author}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-400">{book.category}</p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="font-medium">{formatTHB(book.priceCents)}</span>
                <Link
                  href={`/cart?add=${book.id}`}
                  className="rounded-full bg-black text-white dark:bg-white dark:text-black text-sm px-4 py-1.5"
                >
                  Add to cart
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
