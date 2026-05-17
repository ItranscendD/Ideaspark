// ---------------------------------------------------------------------------
// Paystack API helper — server-only, never import this in client components
// ---------------------------------------------------------------------------

import { PLAN_AMOUNT_KOBO, FREE_GENERATION_LIMIT } from "@/lib/constants";

export const PAYSTACK_BASE = "https://api.paystack.co";

/** ---------------------------------------------------------------------------
 * Initialize a Paystack transaction (hosted checkout page).
 * Returns { authorization_url, access_code, reference } on success.
 * ---------------------------------------------------------------------------*/
export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  planCode?: string;
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amountKobo,
    callback_url: params.callbackUrl,
    channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
    metadata: params.metadata ?? {},
  };

  // If a plan code is provided, Paystack auto-creates a subscription after payment
  if (params.planCode) {
    body.plan = params.planCode;
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack init failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data: { authorization_url: string; access_code: string; reference: string };
  };

  if (!json.status) throw new Error(`Paystack error: ${json.message}`);
  return json.data;
}

/** ---------------------------------------------------------------------------
 * Verify a transaction by reference.
 * Returns the full transaction object from Paystack.
 * ---------------------------------------------------------------------------*/
export async function verifyTransaction(reference: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  customer: { email: string; customer_code: string };
  metadata: Record<string, unknown>;
  subscription: { subscription_code: string } | null;
}> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack verify failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { status: boolean; message: string; data: unknown };
  if (!json.status) throw new Error(`Paystack verify error: ${json.message}`);

  return json.data as ReturnType<typeof verifyTransaction> extends Promise<infer T> ? T : never;
}

/** ---------------------------------------------------------------------------
 * Verify a Paystack webhook signature.
 * Paystack signs every webhook body with HMAC-SHA512 using your secret key.
 * The digest is sent in the `x-paystack-signature` header.
 * ---------------------------------------------------------------------------*/
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return false;

  // Use Web Crypto API (works in both Node.js 18+ and Cloudflare Workers)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const bodyData = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, bodyData);
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (expectedHex.length !== signatureHeader.length) return false;

  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}

/** ---------------------------------------------------------------------------
 * Check if a customer has an active subscription by email.
 * This allows "restoring" access without a central database.
 * ---------------------------------------------------------------------------*/
export async function checkCustomerSubscription(email: string): Promise<boolean> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(`${PAYSTACK_BASE}/subscription?customer=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack subscription check failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    status: boolean;
    data: Array<{ status: string }>;
  };

  if (!json.status) return false;

  // Check if any subscription for this customer is "active"
  return json.data.some((sub) => sub.status === "active" || sub.status === "non-renewing");
}
