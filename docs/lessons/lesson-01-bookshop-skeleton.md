# Lesson 1 — Bookshop skeleton

## Goal
Stand up a plain Next.js bookshop (catalog + cart) with **no agent and no AP2 mandates** — a manual-checkout baseline to compare every later lesson against.

## What we built
- `types/book.ts`, `lib/catalog.ts` — a static in-memory book catalog.
- `app/page.tsx` — book listing grid, "Add to cart" links.
- `lib/cart.ts`, `app/cart/page.tsx` — cart state kept in `localStorage`, a disabled "Checkout (manual, no agent yet)" button.

![Lesson 1 architecture](../diagrams/lesson-01-architecture.svg)

## Why we did it this way
- **localStorage over a real backend for the cart**: the point of Lesson 1 is the *shopping* surface, not persistence. Introducing a database or API route here would bury the AP2 concepts we're about to layer on under incidental setup.
- **Checkout button is a disabled no-op**, not wired to anything: it marks the exact seam where Lesson 2 onward will insert the agent. Leaving it visibly inert (rather than deleting it) makes the "before" state legible when we diff against later lessons.

## What this unlocks
- A concrete "manual flow" to point at when explaining *why* AP2 exists: every step a human clicks here is a step an agent will later have to prove it was authorized to take.
- A stable UI (catalog + cart) that later lessons reuse without touching — only the checkout path grows.

## Alternatives considered
- **Server-rendered cart with a database (e.g., SQLite/Postgres) from the start** — more "production-like," but adds a persistence layer and migrations before we've written a single line of AP2 code. Deferred until a lesson actually needs durable order records (Lesson 7).
- **Skipping the manual baseline and starting directly with the agent** — would work, but loses the explicit contrast that makes AP2's Intent/Cart/Payment mandate separation land as "solving a real problem" rather than "protocol for its own sake."

## Backend note
No backend yet. When one is needed (starting Lesson 5, for Stripe settlement, and Lesson 6, for mandate-signature verification), we'll use **TypeScript (Next.js API routes)** for anything that's mostly orchestration/HTTP glue, and reserve **Go** for a component if it needs to be a standalone verifier/service outside the Next.js process (e.g., a separate signature-verification microservice in Lesson 6) — decided per-lesson based on whether the piece needs to exist independently of the web app.
