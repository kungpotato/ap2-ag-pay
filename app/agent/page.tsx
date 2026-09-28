"use client";

import Link from "next/link";
import { useState } from "react";
import { SignedEnvelope, IntentMandate } from "@/lib/ap2/types";
import { verifyEnvelopeInBrowser } from "@/lib/ap2/verifyClient";

type VerifyState = "idle" | "checking" | "valid" | "invalid";

export default function AgentPage() {
  const [message, setMessage] = useState("หาหนังสือ Go ราคาไม่เกิน 500 บาท");
  const [envelope, setEnvelope] = useState<SignedEnvelope<IntentMandate> | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [loading, setLoading] = useState(false);

  async function askAgent() {
    setLoading(true);
    setVerifyState("idle");
    try {
      const res = await fetch("/api/agent/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data: SignedEnvelope<IntentMandate> = await res.json();
      setEnvelope(data);
      setVerifyState("checking");
      const ok = await verifyEnvelopeInBrowser(data);
      setVerifyState(ok ? "valid" : "invalid");
    } finally {
      setLoading(false);
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
          disabled={loading || message.trim().length === 0}
          className="self-start rounded-full bg-black text-white dark:bg-white dark:text-black text-sm px-5 py-2 disabled:opacity-40"
        >
          {loading ? "Agent กำลังสร้าง mandate..." : "Ask agent"}
        </button>

        {envelope && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Intent Mandate</span>
              <VerifyBadge state={verifyState} />
            </div>
            <pre className="text-xs overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
              {JSON.stringify(envelope, null, 2)}
            </pre>
            <p className="text-xs text-zinc-500">
              Budget: ฿{(envelope.payload.constraints.maxAmountCents / 100).toFixed(2)} · หมดอายุ{" "}
              {new Date(envelope.payload.expiresAt).toLocaleTimeString("th-TH")} · parsed by{" "}
              {envelope.payload.parsedBy}
            </p>
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
