// ---------------------------------------------------------------------------
// POST /api/payment/initialize
//
// Called by the frontend when a user hits the paywall.
// Creates a Paystack hosted-checkout session and returns the payment URL.
//
// Request body: { email: string }
// Response:     { paymentUrl: string; reference: string }
// ---------------------------------------------------------------------------

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { initializeTransaction } from "@/lib/paystack";
import { PLAN_AMOUNT_KOBO } from "@/lib/constants";

export const APIRoute = createAPIFileRoute("/api/payment/initialize")({
  POST: async ({ request }) => {
    // ── Parse body ──────────────────────────────────────────────────────────
    let email: string;
    try {
      const body = (await request.json()) as { email?: string };
      email = (body.email ?? "").trim().toLowerCase();
    } catch {
      return jsonError("Invalid request body — expected JSON with { email }", 400);
    }

    if (!email || !email.includes("@")) {
      return jsonError("A valid email address is required", 400);
    }

    // ── Build the callback URL ───────────────────────────────────────────────
    // After Paystack payment, the user is sent back here with ?reference=...
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/?payment=success`;

    // ── Optional: attach plan code for auto-subscription ────────────────────
    // Set PAYSTACK_PLAN_CODE in your env if you have a recurring plan set up
    // in the Paystack dashboard. If absent, it's a one-time charge.
    const planCode = process.env.PAYSTACK_PLAN_CODE ?? undefined;

    // ── Call Paystack ────────────────────────────────────────────────────────
    try {
      const { authorization_url, reference } = await initializeTransaction({
        email,
        amountKobo: PLAN_AMOUNT_KOBO,
        callbackUrl,
        planCode,
        metadata: {
          product: "TitleForge Pro",
          plan: "$2/month",
          email,
        },
      });

      return json({ paymentUrl: authorization_url, reference }, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment initialization failed";
      console.error("[payment/initialize]", message);
      return jsonError(message, 502);
    }
  },

  // ── CORS preflight for local dev ─────────────────────────────────────────
  OPTIONS: async () =>
    new Response(null, {
      status: 204,
      headers: corsHeaders(),
    }),
});

// ── Helpers ────────────────────────────────────────────────────────────────

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function jsonError(message: string, status: number) {
  return json({ error: message }, status);
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
