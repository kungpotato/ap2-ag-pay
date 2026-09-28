import { SignedEnvelope } from "./types";

const VERIFIER_URL = process.env.AP2_VERIFIER_URL ?? "http://localhost:8787/verify";

/**
 * Verifies a signed envelope by calling the standalone Go verifier
 * (verifier/main.go) instead of checking the signature locally. Unlike
 * lib/ap2/sign.ts's verifyEnvelope, this never trusts the Next.js
 * process's own conclusion — it asks a separate codebase, in a different
 * language, running as a separate process, and only believes its answer.
 * If that process is unreachable, this fails closed rather than falling
 * back to local verification, since the point is that payment should not
 * proceed on the app's own say-so alone.
 */
export async function verifyEnvelopeRemote<T>(
  envelope: SignedEnvelope<T>
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(VERIFIER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: envelope.payload,
        signature: envelope.signature,
        signerPublicKey: envelope.signerPublicKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, reason: data.reason ?? `verifier service returned ${res.status}` };
    }
    return { ok: Boolean(data.valid), reason: data.reason };
  } catch {
    return {
      ok: false,
      reason: "verifier service unreachable — run `go run verifier/main.go` and retry",
    };
  }
}
