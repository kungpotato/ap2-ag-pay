"use client";

import Link from "next/link";
import { useState } from "react";
import { SignedEnvelope, IntentMandate, CartMandate } from "@/lib/ap2/types";
import { verifyEnvelopeInBrowser } from "@/lib/ap2/verifyClient";

type VerifyState = "idle" | "checking" | "valid" | "invalid";

export default function AgentPage() {
  const [message, setMessage] = useState("หาหนังสือ Go ราคาไม่เกิน 500 บาท");
  const [intentEnvelope, setIntentEnvelope] = useState<SignedEnvelope<IntentMandate> | null>(null);
  const [intentVerify, setIntentVerify] = useState<VerifyState>("idle");
  const [loadingIntent, setLoadingIntent] = useState(false);

  const [cartEnvelope, setCartEnvelope] = useState<SignedEnvelope<CartMandate> | null>(null);
  const [cartVerify, setCartVerify] = useState<VerifyState>("idle");
  const [cartError, setCartError] = useState<string | null>(null);
  const [loadingCart, setLoadingCart] = useState(false);

  const [tamperError, setTamperError] = useState<string | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);

  async function askAgent() {
    setLoadingIntent(true);
    setIntentVerify("idle");
    setCartEnvelope(null);
    setCartError(null);
    setTamperError(null);
    try {
      const res = await fetch("/api/agent/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data: SignedEnvelope<IntentMandate> = await res.json();
      setIntentEnvelope(data);
      setIntentVerify("checking");
      const ok = await verifyEnvelopeInBrowser(data);
      setIntentVerify(ok ? "valid" : "invalid");
    } finally {
      setLoadingIntent(false);
    }
  }

  async function buildCart() {
    if (!intentEnvelope) return;
    setLoadingCart(true);
    setCartError(null);
    setCartVerify("idle");
    try {
      const res = await fetch("/api/agent/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intentEnvelope),
      });
      const data = await res.json();
      if (!res.ok) {
        setCartError(data.error ?? "unknown error");
        return;
      }
      setCartEnvelope(data);
      setCartVerify("checking");
      const ok = await verifyEnvelopeInBrowser(data);
      setCartVerify(ok ? "valid" : "invalid");
    } finally {
      setLoadingCart(false);
    }
  }

  async function tamperTest() {
    if (!intentEnvelope) return;
    setTamperLoading(true);
    setTamperError(null);
    try {
      const tampered = {
        ...intentEnvelope,
        payload: { ...intentEnvelope.payload, constraints: { ...intentEnvelope.payload.constraints, maxAmountCents: intentEnvelope.payload.constraints.maxAmountCents + 100000 } },
      };
      const res = await fetch("/api/agent/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tampered),
      });
      const data = await res.json();
      setTamperError(res.ok ? "⚠️ server accepted a tampered mandate (this should not happen)" : `merchant rejected it: "${data.error}"`);
    } finally {
      setTamperLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/10 dark:border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium underline">
          ← Back to shop
        </Link>
        <h1 className="text-xl font-semibold">🤖 Shopping agent</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-4">
        <label className="text-sm font-medium">บอก agent ว่าอยากได้หนังสืออะไร</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm"
        />
        <button
          onClick={askAgent}
          disabled={loadingIntent || message.trim().length === 0}
          className="self-start rounded-full bg-black text-white dark:bg-white dark:text-black text-sm px-5 py-2 disabled:opacity-40"
        >
          {loadingIntent ? "Agent กำลังสร้าง mandate..." : "Ask agent"}
        </button>

        {intentEnvelope && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">1. Intent Mandate</span>
              <VerifyBadge state={intentVerify} />
              <span className="text-xs text-zinc-400">signed by user agent</span>
            </div>
            <pre className="text-xs overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 max-h-56">
              {JSON.stringify(intentEnvelope, null, 2)}
            </pre>
            <p className="text-xs text-zinc-500">
              Budget: ฿{(intentEnvelope.payload.constraints.maxAmountCents / 100).toFixed(2)} · หมดอายุ{" "}
              {new Date(intentEnvelope.payload.expiresAt).toLocaleTimeString("th-TH")} · parsed by{" "}
              {intentEnvelope.payload.parsedBy}
            </p>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={buildCart}
                disabled={loadingCart}
                className="self-start rounded-full bg-black text-white dark:bg-white dark:text-black text-sm px-5 py-2 disabled:opacity-40"
              >
                {loadingCart ? "Merchant กำลังจัด cart..." : "2. Build cart (merchant)"}
              </button>
              <button
                onClick={tamperTest}
                disabled={tamperLoading}
                className="self-start rounded-full border border-red-300 text-red-600 text-sm px-4 py-2 disabled:opacity-40"
              >
                {tamperLoading ? "กำลังทดสอบ..." : "ทดสอบ tamper intent"}
              </button>
            </div>

            {tamperError && <p className="text-xs text-red-600">{tamperError}</p>}
            {cartError && <p className="text-xs text-red-600">merchant ปฏิเสธ: {cartError}</p>}

            {cartEnvelope && (
              <div className="flex flex-col gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">3. Cart Mandate</span>
                  <VerifyBadge state={cartVerify} />
                  <span className="text-xs text-zinc-400">signed by merchant (different key)</span>
                </div>
                <pre className="text-xs overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 max-h-56">
                  {JSON.stringify(cartEnvelope, null, 2)}
                </pre>
                <p className="text-xs text-zinc-500">
                  รวม ฿{(cartEnvelope.payload.totalCents / 100).toFixed(2)} · {cartEnvelope.payload.items.length} เล่ม ·
                  ผูกกับ intent {cartEnvelope.payload.intentMandateId.slice(0, 8)}…
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function VerifyBadge({ state }: { state: VerifyState }) {
  if (state === "idle") return null;
  const styles: Record<Exclude<VerifyState, "idle">, string> = {
    checking: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
    valid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    invalid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const label = { checking: "verifying…", valid: "✓ signature valid", invalid: "✕ signature invalid" }[
    state as Exclude<VerifyState, "idle">
  ];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[state as Exclude<VerifyState, "idle">]}`}>
      {label}
    </span>
  );
}
