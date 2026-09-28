import { catalog } from "@/lib/catalog";
import { IntentConstraints } from "./types";

const OPENROUTER_MODEL = "google/gemini-3.8-flash";

/**
 * Optional LLM-backed parser via OpenRouter. Used only when
 * OPENROUTER_API_KEY is set; otherwise the caller falls back to the
 * deterministic rule-based parser in parseIntent.ts. AP2 is indifferent to
 * which one produced the constraints — only the signed output matters.
 */
export async function parseIntentWithLLM(message: string): Promise<IntentConstraints | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const categories = Array.from(new Set(catalog.map((b) => b.category)));
  const bookList = catalog.map((b) => `${b.id}: "${b.title}" by ${b.author} (${b.category})`).join("\n");

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Extract shopping constraints from the user's message as strict JSON only, no prose. " +
              `Schema: {"maxAmountCents": number, "currency": "THB", "category": string|null, "keywords": string[]}. ` +
              `"keywords" must only contain book ids from this catalog that match the request:\n${bookList}\n` +
              `"category" must be one of: ${categories.join(", ")}, or null.`,
          },
          { role: "user", content: message },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (typeof parsed.maxAmountCents !== "number") return null;

    return {
      maxAmountCents: parsed.maxAmountCents,
      currency: "THB",
      category: parsed.category ?? undefined,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch {
    return null;
  }
}
