export type IntentConstraints = {
  maxAmountCents: number;
  currency: "THB";
  category?: string;
  keywords: string[];
};

export type IntentMandate = {
  type: "IntentMandate";
  id: string;
  userId: string;
  naturalLanguageDescription: string;
  constraints: IntentConstraints;
  createdAt: string;
  expiresAt: string;
  parsedBy: "llm" | "rule-based";
};

export type SignedEnvelope<T> = {
  payload: T;
  signature: string;
  signerPublicKey: string;
  signedAt: string;
};
