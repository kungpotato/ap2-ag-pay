import { catalog } from "@/lib/catalog";
import { IntentConstraints } from "./types";

/**
 * Rule-based stand-in for an LLM parser. AP2 doesn't care how the natural
 * language became structured constraints — only that the result is a
 * signed, verifiable object. Swapping this for a real LLM call later
 * doesn't change anything downstream.
 */
export function parseIntent(message: string): IntentConstraints {
  const lower = message.toLowerCase();

  const priceMatch = lower.match(/(\d{2,6})\s*(บาท|thb|baht)?/);
  const maxAmountCents = priceMatch ? Number(priceMatch[1]) * 100 : 100000;

  const categories = Array.from(new Set(catalog.map((b) => b.category.toLowerCase())));
  const category = categories.find((c) => lower.includes(c));

  const STOPWORDS = new Set(["the", "and", "of", "a", "an", "in", "on", "to", "is", "for"]);
  const messageWords = lower.split(/[^a-z0-9ก-๙]+/).filter((w) => w.length >= 2 && !STOPWORDS.has(w));

  const keywords = Array.from(
    new Set(
      catalog
        .filter((book) => {
          const bookWords = `${book.title} ${book.author}`
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
          return bookWords.some((word) => messageWords.includes(word));
        })
        .map((book) => book.id)
    )
  );

  return {
    maxAmountCents,
    currency: "THB",
    category,
    keywords: Array.from(new Set(keywords)),
  };
}
