import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { stripe } from "@/lib/stripe";
import { publicOrigin } from "@/lib/origin";
import { getOrCreateStripeCustomer } from "@/lib/checkout";
import { limitOrThrow } from "@/lib/rateLimit";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerKey = req.headers.get("x-owner-key") || "";
  const auth = await query<{
    owner_secret_hash: string;
    creator_email: string;
    company_name: string;
    stripe_customer_id: string | null;
    status: string;
    payout_mode: string;
    payment_verified: boolean;
  }>("SELECT owner_secret_hash, creator_email, company_name, stripe_customer_id, status, payout_mode, payment_verified FROM bounties WHERE id=$1", [id]);
  const bounty = auth.rows[0];
  if (!bounty || !ownerKey || !safeEqualHex(bounty.owner_secret_hash, hashToken(ownerKey))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (bounty.status !== "active") return NextResponse.json({ error: "Publish the campaign before holding #1." }, { status: 400 });
  if (bounty.payout_mode !== "stripe") return NextResponse.json({ error: "Hold #1 is for automatic-payout campaigns." }, { status: 400 });

  try {
    limitOrThrow(req, "featured", 8);
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    const customer = await getOrCreateStripeCustomer({ id, creator_email: bounty.creator_email, company_name: bounty.company_name, stripe_customer_id: bounty.stripe_customer_id });
    const origin = publicOrigin(req);
    const returnPath = `/manage/${id}?key=${encodeURIComponent(ownerKey)}`;
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer,
      payment_intent_data: { setup_future_usage: "off_session" },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: config.featuredFeeCents,
          product_data: {
            name: `Hold #1 for ${config.featuredHoldDays} days`,
            description: `Pin ${bounty.company_name} at the top of the FirstCustomer board`,
          },
        },
      }],
      metadata: { bounty_id: id, kind: "featured" },
      success_url: `${origin}${returnPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}&cancelled=1`,
    });
    if (!session.url) return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error(error);
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start checkout" }, { status: status === 429 ? 429 : 400 });
  }
}
