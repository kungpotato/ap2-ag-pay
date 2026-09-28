# AP2 Agentic Payment Bookshop

Workshop repo: an online book seller built with **Next.js**, where checkout is progressively handed to an agent using **Google's AP2 (Agent Payments Protocol)** for authorization mandates, settling money via **Stripe**.

Each lesson lives on top of the last. Every lesson's [docs/lessons](docs/lessons) write-up (in Thai) covers: goal, what was built, why it was built that way, what it unlocks, and alternatives considered — plus an architecture diagram and a demo GIF/screenshot.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Lessons

| # | Lesson | Demo |
|---|--------|------|
| 1 | [โครงร่างร้านหนังสือ (Bookshop skeleton)](docs/lessons/lesson-01-bookshop-skeleton.md) — catalog + cart, no agent yet | ![lesson 1 demo](docs/screenshots/lesson-01-flow.gif) |
| 2 | [Intent Mandate](docs/lessons/lesson-02-intent-mandate.md) — shopping agent turns a chat message into a signed, verifiable Intent Mandate (Ed25519) | ![lesson 2 demo](docs/screenshots/lesson-02-flow.gif) |
| 3 | [Cart Mandate](docs/lessons/lesson-03-cart-mandate.md) — merchant verifies the Intent Mandate, builds a cart within budget, and signs it with its own key | ![lesson 3 demo](docs/screenshots/lesson-03-flow.gif) |
| 4 | [Human-in-the-loop approval](docs/lessons/lesson-04-human-approval.md) — a human (or a policy-checked auto-approve) signs off on the Cart Mandate with a third, distinct key before payment can happen | ![lesson 4 demo](docs/screenshots/lesson-04-flow.gif) |
| 5 | [Payment Mandate + Stripe](docs/lessons/lesson-05-payment-mandate.md) — verifies the full intent → cart → approval chain, settles via a real Stripe test-mode PaymentIntent, and signs the result as a Payment Mandate | ![lesson 5 demo](docs/screenshots/lesson-05-flow.gif) |

More lessons (signature verification, webhooks, failure/dispute scenarios) land as the workshop progresses — see [docs/lessons](docs/lessons).

## Stack

- **Frontend**: Next.js (App Router) + Tailwind
- **Protocol**: [AP2](https://github.com/google-agentic-commerce/AP2) mandates (Intent / Cart / Payment)
- **Settlement**: Stripe (test mode), via `STRIPE_SECRET_KEY` — see `.env.example`
- **Backend**: TypeScript (Next.js API routes) for orchestration/HTTP glue (from Lesson 2); Go reserved for any component that needs to run as a standalone service outside the Next.js process (e.g. a signature-verification microservice, from Lesson 6)
- **Optional LLM**: OpenRouter (Gemini 3.8 Flash) for intent parsing, via `OPENROUTER_API_KEY` — falls back to a deterministic rule-based parser when unset
