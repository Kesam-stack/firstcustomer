import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomToken, hashToken } from "@/lib/security";
import { slugify } from "@/lib/slug";
import { stripe } from "@/lib/stripe";
import { requireEmail, requireHttpUrl, requireInt, requireString } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyName = requireString(body.companyName, "Company", 80);
    const productUrl = requireHttpUrl(body.productUrl);
    const creatorEmail = requireEmail(body.creatorEmail);
    const headline = requireString(body.headline, "Headline", 140);
    const desiredAction = requireString(body.desiredAction, "Customer criteria", 300);
    const rewardDollars = requireInt(body.rewardDollars, "Reward", 1, 100000);
    const goalCount = requireInt(body.goalCount, "Goal", 1, 10000);

    const ownerKey = randomToken(24);
    const ownerSecretHash = hashToken(ownerKey);
    const slug = slugify(companyName);
    const rewardCents = rewardDollars * 100;

    const inserted = await query<{ id: string }>(
      `INSERT INTO bounties
       (slug, owner_secret_hash, creator_email, company_name, product_url, headline, desired_action, reward_cents, goal_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [slug, ownerSecretHash, creatorEmail, companyName, productUrl, headline, desiredAction, rewardCents, goalCount],
    );

    const bountyId = inserted.rows[0].id;
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    if (!process.env.STRIPE_SECRET_KEY) {
      if (process.env.ALLOW_DEMO_BILLING === "true" && process.env.NODE_ENV !== "production") {
        await query("UPDATE bounties SET status='active', activated_at=NOW() WHERE id=$1", [bountyId]);
        return NextResponse.json({ checkoutUrl: `${origin}/launch/success?bounty=${bountyId}&key=${encodeURIComponent(ownerKey)}` });
      }
      await query("DELETE FROM bounties WHERE id=$1", [bountyId]);
      return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
    }

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: creatorEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 900,
          product_data: {
            name: "FirstCustomer bounty launch",
            description: `Launch ${companyName}'s public customer bounty`,
          },
        },
      }],
      metadata: { bounty_id: bountyId },
      success_url: `${origin}/launch/success?bounty=${bountyId}&key=${encodeURIComponent(ownerKey)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create?cancelled=1`,
      allow_promotion_codes: true,
    });

    await query("UPDATE bounties SET stripe_session_id=$2 WHERE id=$1", [bountyId, session.id]);
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
