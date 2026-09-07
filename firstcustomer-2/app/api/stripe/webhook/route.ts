import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  try {
    const raw = await req.text();
    const event = stripe().webhooks.constructEvent(raw, signature, secret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bountyId = session.metadata?.bounty_id;
      if (bountyId && session.payment_status === "paid") {
        await query(
          "UPDATE bounties SET status='active', activated_at=COALESCE(activated_at,NOW()), stripe_session_id=$2 WHERE id=$1",
          [bountyId, session.id],
        );
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
