import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { stripe } from "@/lib/stripe";
import { publicOrigin } from "@/lib/origin";
import { getOrCreateStripeCustomer } from "@/lib/checkout";
import { limitOrThrow } from "@/lib/rateLimit";

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
  }>("SELECT owner_secret_hash, creator_email, company_name, stripe_customer_id, status FROM bounties WHERE id=$1", [id]);
  const bounty = auth.rows[0];
  if (!bounty || !ownerKey || !safeEqualHex(bounty.owner_secret_hash, hashToken(ownerKey))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (bounty.status === "closed") return NextResponse.json({ error: "This campaign is closed." }, { status: 400 });

  try {
    limitOrThrow(req, "billing", 8);
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    const customer = await getOrCreateStripeCustomer({ id, creator_email: bounty.creator_email, company_name: bounty.company_name, stripe_customer_id: bounty.stripe_customer_id });
    const origin = publicOrigin(req);
    const returnPath = `/manage/${id}?key=${encodeURIComponent(ownerKey)}`;
    const session = await stripe().checkout.sessions.create({
      mode: "setup",
      customer,
      payment_method_types: ["card"],
      setup_intent_data: { metadata: { bounty_id: id, kind: "billing" } },
      metadata: { bounty_id: id, kind: "billing" },
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
