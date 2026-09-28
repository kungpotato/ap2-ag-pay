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

export type CartItem = {
  bookId: string;
  title: string;
  unitPriceCents: number;
  qty: number;
};

export type CartMandate = {
  type: "CartMandate";
  id: string;
  intentMandateId: string;
  merchantId: string;
  items: CartItem[];
  totalCents: number;
  currency: "THB";
  createdAt: string;
  expiresAt: string;
};

export type CartApproval = {
  type: "CartApproval";
  id: string;
  cartMandateId: string;
  intentMandateId: string;
  approvedTotalCents: number;
  currency: "THB";
  approvalMethod: "human-click" | "auto-approved-within-budget";
  createdAt: string;
};

export type SignedEnvelope<T> = {
  payload: T;
  signature: string;
  signerPublicKey: string;
  signedAt: string;
};
