import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { distributeCampaign } from "@/lib/network";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  try {
    const event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bountyId = session.metadata?.bounty_id;
      if (bountyId && session.payment_status === "paid") {
        let paymentMethod: string | null = null;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
        if (paymentIntentId) {
          const paymentIntent = await stripe().paymentIntents.retrieve(paymentIntentId);
          paymentMethod = typeof paymentIntent.payment_method === "string" ? paymentIntent.payment_method : null;
        }
        await query(
          `UPDATE bounties
              SET status='active',activated_at=COALESCE(activated_at,NOW()),stripe_session_id=$2,
                  stripe_customer_id=COALESCE($3,stripe_customer_id),stripe_payment_method_id=COALESCE($4,stripe_payment_method_id),
                  payment_verified=TRUE
            WHERE id=$1`,
          [bountyId, session.id, typeof session.customer === "string" ? session.customer : null, paymentMethod],
        );
        try {
          await distributeCampaign(bountyId);
        } catch (distributionError) {
          console.error("Campaign activated but network distribution failed", distributionError);
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
