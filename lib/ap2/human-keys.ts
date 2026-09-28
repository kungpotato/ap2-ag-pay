/**
 * DEMO keypair representing the HUMAN APPROVER — a third, distinct keypair
 * from the user agent (demo-keys.ts, drafts intents) and the merchant
 * (merchant-keys.ts, confirms carts). AP2 keeps "agent decided this" and
 * "a human authorized paying for it" as separate, separately verifiable
 * facts. In a real deployment this key (or an equivalent second factor)
 * lives behind an actual human action — a device biometric, a passkey
 * prompt — never something the agent can invoke on its own.
 */
export const HUMAN_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAUbW+I09q/+XWghhel/9icvj4+4HFGV/bbUYaIFI+PQ8=
-----END PUBLIC KEY-----
`;

export const HUMAN_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIEpEl2YiigBHRAs6AoYl3jsu547H0Ex102jQeWSUIlv3
-----END PRIVATE KEY-----
`;
