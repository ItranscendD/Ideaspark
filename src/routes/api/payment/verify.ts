// ---------------------------------------------------------------------------
// GET /api/payment/verify?reference=xxx
//
// Called by the frontend after Paystack redirects back with ?payment=success.
// Verifies the transaction with Paystack's API and returns the status.
//
// Query param: reference (the Paystack transaction reference)
// Response:    { verified: boolean; email?: string; reference?: string }
// ---------------------------------------------------------------------------

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { verifyTransaction } from "@/lib/paystack";

export const APIRoute = createAPIFileRoute("/api/payment/verify")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference")?.trim();

    if (!reference) {
      return jsonError("Missing required query param: reference", 400);
    }

    try {
      const txn = await verifyTransaction(reference);

      if (txn.status !== "success") {
        return json({ verified: false, reason: `Transaction status is '${txn.status}'` }, 200);
      }

      return json(
        {
          verified: true,
          email: txn.customer.email,
          reference,
          subscriptionCode: txn.subscription?.subscription_code ?? null,
        },
        200,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      console.error("[payment/verify]", message);
      return jsonError(message, 502);
    }
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return json({ error: message }, status);
}
