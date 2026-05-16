import { createAPIFileRoute } from "@tanstack/react-start/api";
import { checkCustomerSubscription } from "@/lib/paystack";

/** ---------------------------------------------------------------------------
 * POST /api/payment/restore
 * Body: { email: string }
 *
 * Verifies with Paystack if the email has an active subscription.
 * Allows users to "log back in" to their Pro status on any device.
 * ---------------------------------------------------------------------------*/
export const APIRoute = createAPIFileRoute("/api/payment/restore")({
  POST: async ({ request }) => {
    try {
      const { email } = (await request.json()) as { email: string };

      if (!email || !email.includes("@")) {
        return new Response(JSON.stringify({ error: "Valid email is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isSubscribed = await checkCustomerSubscription(email);

      return new Response(JSON.stringify({ subscribed: isSubscribed }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[api/payment/restore] Error:", err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Restore failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
