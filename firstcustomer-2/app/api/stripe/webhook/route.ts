import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { applyCheckoutSession } from "@/lib/checkout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  try {
    const event = stripe().webhooks.constructEvent(await req.text(), signature, secret);

    if (event.type === "checkout.session.completed") {
      await applyCheckoutSession(event.data.object);
    }

    if (event.type === "account.updated") {
      const account = event.data.object;
      const enabled = Boolean(account.payouts_enabled);

      const identity = await query<{ id: string }>(
        `UPDATE referrer_identities
            SET payouts_enabled=$2,updated_at=NOW()
          WHERE stripe_account_id=$1
          RETURNING id`,
        [account.id, enabled],
      );

      if (identity.rows[0]) {
        await query(
          "UPDATE referrals SET payouts_enabled=$2,stripe_account_id=$3 WHERE identity_id=$1",
          [identity.rows[0].id, enabled, account.id],
        );
      } else {
        await query(
          "UPDATE referrals SET payouts_enabled=$2 WHERE stripe_account_id=$1",
          [account.id, enabled],
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
