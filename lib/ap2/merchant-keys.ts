/**
 * DEMO keypair representing the MERCHANT signer — deliberately a different
 * keypair from lib/ap2/demo-keys.ts (the user agent's key). A Cart Mandate
 * is the merchant vouching for price/availability, not the user restating
 * their own intent, so it must carry a different signature that anyone can
 * trace back to "the merchant said this," independent of the user agent.
 */
export const MERCHANT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAIn0Lpbn1Xf8k1lYdxWzY2UYeI952fi6lk4rROSvT8/c=
-----END PUBLIC KEY-----
`;

export const MERCHANT_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIElouaPUbJaXyOwqb825iP6jLrHlq3GdcGmer8YOC8Wr
-----END PRIVATE KEY-----
`;
