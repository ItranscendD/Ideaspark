// ---------------------------------------------------------------------------
// POST /api/webhooks/paystack
//
// Paystack calls this endpoint whenever a payment event occurs.
// Register this URL in your Paystack dashboard under:
//   Settings → API Keys & Webhooks → Webhook URL
//
// Security: every request is signed with HMAC-SHA512 using your secret key.
// We verify the signature before processing any event.
//
// Events handled:
//   charge.success          — one-time or first subscription payment succeeded
//   subscription.create     — recurring subscription created
//   subscription.disable    — subscription cancelled/disabled
//   invoice.payment_failed  — recurring charge failed (you may want to email user)
// ---------------------------------------------------------------------------

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { verifyWebhookSignature } from "@/lib/paystack";

// ── Paystack event shape (partial — only fields we use) ───────────────────
interface PaystackEvent {
  event: string;
  data: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    customer?: {
      email: string;
      customer_code: string;
    };
    subscription_code?: string;
    subscription?: {
      subscription_code: string;
      status: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export const APIRoute = createAPIFileRoute("/api/webhooks/paystack")({
  POST: async ({ request }) => {
    // ── 1. Read raw body (required for HMAC verification) ──────────────────
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // ── 2. Verify signature ────────────────────────────────────────────────
    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[webhook/paystack] Invalid signature — request rejected");
      return new Response("Unauthorized", { status: 401 });
    }

    // ── 3. Parse event ─────────────────────────────────────────────────────
    let event: PaystackEvent;
    try {
      event = JSON.parse(rawBody) as PaystackEvent;
    } catch {
      return new Response("Bad Request — invalid JSON", { status: 400 });
    }

    // ── 4. Acknowledge immediately (Paystack retries if no 200 within 30s) ─
    // We process synchronously here because we're in a serverless function.
    // For heavy work, push to a queue and return 200 right away.

    console.log(`[webhook/paystack] Event received: ${event.event}`);

    // ── 5. Route events ────────────────────────────────────────────────────
    try {
      switch (event.event) {
        // ------------------------------------------------------------------
        // charge.success
        // Fired when any transaction succeeds — including the first payment
        // for a new subscription. Use this to grant access.
        // ------------------------------------------------------------------
        case "charge.success": {
          const { reference, customer, status, amount, currency, metadata } = event.data;

          if (status !== "success") break;

          console.log(
            `[webhook/paystack] Payment success — ref: ${reference}, ` +
            `customer: ${customer?.email}, amount: ${amount} ${currency}`
          );

          // ----------------------------------------------------------------
          // ⬇️  YOUR BUSINESS LOGIC GOES HERE
          //
          // Examples of what you might do:
          //   - Look up user by customer.email in your database
          //   - Set user.isPro = true / user.subscriptionActive = true
          //   - Send a welcome/receipt email
          //   - Log to your analytics
          //
          // For this app (no DB yet), the frontend handles state via
          // localStorage after calling /api/payment/verify on redirect.
          // ----------------------------------------------------------------

          console.log(
            `[webhook/paystack] ✅ Access granted for ${customer?.email}`,
            { reference, metadata }
          );
          break;
        }

        // ------------------------------------------------------------------
        // subscription.create
        // Fired when Paystack creates a recurring subscription record.
        // ------------------------------------------------------------------
        case "subscription.create": {
          const { subscription_code, customer } = event.data;
          console.log(
            `[webhook/paystack] Subscription created — code: ${subscription_code}, ` +
            `customer: ${customer?.email}`
          );

          // ----------------------------------------------------------------
          // ⬇️  YOUR BUSINESS LOGIC GOES HERE
          //   - Store subscription_code against the user for future management
          //   - Update user record: subscription_status = "active"
          // ----------------------------------------------------------------
          break;
        }

        // ------------------------------------------------------------------
        // subscription.disable
        // Fired when a subscription is cancelled or payment method expires.
        // ------------------------------------------------------------------
        case "subscription.disable": {
          const { subscription_code, customer, subscription } = event.data;
          console.log(
            `[webhook/paystack] Subscription disabled — code: ${subscription_code ?? subscription?.subscription_code}, ` +
            `customer: ${customer?.email}, status: ${subscription?.status}`
          );

          // ----------------------------------------------------------------
          // ⬇️  YOUR BUSINESS LOGIC GOES HERE
          //   - Look up user by subscription_code or customer.email
          //   - Set user.isPro = false / user.subscriptionActive = false
          //   - Send a "your subscription has ended" email
          // ----------------------------------------------------------------
          break;
        }

        // ------------------------------------------------------------------
        // invoice.payment_failed
        // Fired when a recurring charge attempt fails (e.g. card expired).
        // ------------------------------------------------------------------
        case "invoice.payment_failed": {
          const { customer, subscription } = event.data;
          console.warn(
            `[webhook/paystack] ⚠️ Recurring payment failed — ` +
            `customer: ${customer?.email}, sub: ${subscription?.subscription_code}`
          );

          // ----------------------------------------------------------------
          // ⬇️  YOUR BUSINESS LOGIC GOES HERE
          //   - Email user to update their payment method
          //   - After grace period, disable access
          // ----------------------------------------------------------------
          break;
        }

        default:
          // Log unhandled events so you can add handlers later
          console.log(`[webhook/paystack] Unhandled event type: ${event.event}`);
      }
    } catch (err) {
      // Log the error but still return 200 so Paystack doesn't retry
      console.error("[webhook/paystack] Error processing event:", err);
    }

    // ── 6. Always return 200 to acknowledge receipt ────────────────────────
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
