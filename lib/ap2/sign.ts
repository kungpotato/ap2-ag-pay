import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from "crypto";
import { SignedEnvelope } from "./types";

/** Deterministic JSON stringify (sorted keys) so signing is stable regardless of key order. */
export function canonicalize(value: unknown): string {
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

export function signPayload<T>(payload: T, privateKeyPem: string, publicKeyPem: string): SignedEnvelope<T> {
  const privateKey = createPrivateKey(privateKeyPem);
  const message = Buffer.from(canonicalize(payload));
  const signature = edSign(null, message, privateKey).toString("base64");
  return {
    payload,
    signature,
    signerPublicKey: publicKeyPem,
    signedAt: new Date().toISOString(),
  };
}

export function verifyEnvelope<T>(envelope: SignedEnvelope<T>): boolean {
  try {
    const publicKey = createPublicKey(envelope.signerPublicKey);
    const message = Buffer.from(canonicalize(envelope.payload));
    return edVerify(null, message, publicKey, Buffer.from(envelope.signature, "base64"));
  } catch {
    return false;
  }
}
