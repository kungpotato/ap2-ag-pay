"use client";

import { SignedEnvelope } from "./types";

/**
 * Browser-side signature check using Web Crypto (Node's `crypto` module
 * isn't available in the browser bundle). Verifying on the client too —
 * not just trusting the server that produced the envelope — is the point:
 * the mandate must be self-evidently valid to anyone holding the public key.
 */
export async function verifyEnvelopeInBrowser<T>(envelope: SignedEnvelope<T>): Promise<boolean> {
  try {
    const pem = envelope.signerPublicKey
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s+/g, "");
    const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

    const publicKey = await crypto.subtle.importKey("spki", keyBytes, { name: "Ed25519" }, false, ["verify"]);

    const message = new TextEncoder().encode(canonicalize(envelope.payload));
    const signature = Uint8Array.from(atob(envelope.signature), (c) => c.charCodeAt(0));

    return await crypto.subtle.verify("Ed25519", publicKey, signature, message);
  } catch {
    return false;
  }
}

function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
