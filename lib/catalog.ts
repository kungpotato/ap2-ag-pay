import { Book } from "@/types/book";

export const catalog: Book[] = [
  { id: "go-101", title: "The Go Programming Language", author: "Donovan & Kernighan", priceCents: 45000, currency: "THB", category: "Programming", coverEmoji: "📘" },
  { id: "clean-code", title: "Clean Code", author: "Robert C. Martin", priceCents: 39000, currency: "THB", category: "Programming", coverEmoji: "📗" },
  { id: "accelerate", title: "Accelerate", author: "Forsgren, Humble, Kim", priceCents: 42000, currency: "THB", category: "Engineering", coverEmoji: "📙" },
  { id: "designing-data", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", priceCents: 55000, currency: "THB", category: "Systems", coverEmoji: "📕" },
  { id: "phoenix-project", title: "The Phoenix Project", author: "Kim, Behr, Spafford", priceCents: 35000, currency: "THB", category: "Engineering", coverEmoji: "📓" },
  { id: "sicp", title: "Structure and Interpretation of Computer Programs", author: "Abelson & Sussman", priceCents: 48000, currency: "THB", category: "Programming", coverEmoji: "📔" },
];

export function findBook(id: string): Book | undefined {
  return catalog.find((b) => b.id === id);
}

export function formatTHB(cents: number): string {
  return (cents / 100).toLocaleString("th-TH", { style: "currency", currency: "THB" });
}
