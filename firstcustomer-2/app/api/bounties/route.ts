import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomToken, hashToken } from "@/lib/security";
import { slugify } from "@/lib/slug";
import { stripe } from "@/lib/stripe";
import { requireEmail, requireHttpUrl, requireInt, requireString } from "@/lib/validation";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyName = requireString(body.companyName, "Company", 80);
    const productUrl = requireHttpUrl(body.productUrl);
    const creatorEmail = requireEmail(body.creatorEmail);
    const companyDescription = requireString(body.companyDescription, "Company description", 280);
    const category = requireString(body.category, "Category", 60);
    const headline = requireString(body.headline, "Headline", 140);
    const desiredAction = requireString(body.desiredAction, "Conversion criteria", 400);
    const referralTerms = requireString(body.referralTerms, "Reward terms", 600);
    const rewardDollars = requireInt(body.rewardDollars, "Reward", Math.ceil(config.minimumRewardCents / 100), 100000);
    const goalCount = requireInt(body.goalCount, "Goal", 1, 10000);
    let logo: string | null = null;
    if (typeof body.companyLogoUrl === "string" && body.companyLogoUrl.trim()) logo = requireHttpUrl(body.companyLogoUrl);
    const payoutMode = body.payoutMode === "manual" ? "manual" : "stripe";
    const ownerKey = randomToken(24);
    const integrationKey = `fc_live_${randomToken(24)}`;
    const slug = slugify(companyName);

    const inserted = await query<{ id: string }>(
      `INSERT INTO bounties(slug,owner_secret_hash,integration_secret_hash,integration_secret_prefix,creator_email,company_name,product_url,company_description,category,company_logo_url,headline,desired_action,referral_terms,reward_cents,goal_count,payout_mode,launch_fee_cents,platform_fee_bps,network_distribution)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,TRUE) RETURNING id`,
      [slug, hashToken(ownerKey), hashToken(integrationKey), integrationKey.slice(0, 12), creatorEmail, companyName, productUrl, companyDescription, category, logo, headline, desiredAction, referralTerms, rewardDollars * 100, goalCount, payoutMode, config.launchFeeCents, config.platformFeeBps],
    );
    const id = inserted.rows[0].id;
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    if (!process.env.STRIPE_SECRET_KEY) {
      await query("DELETE FROM bounties WHERE id=$1", [id]);
      return NextResponse.json({ error: "Payments are not configured yet. Connect Stripe before accepting live campaigns." }, { status: 503 });
    }

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: creatorEmail,
      customer_creation: "always",
      payment_intent_data: { setup_future_usage: "off_session" },
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: config.launchFeeCents, product_data: { name: "FirstCustomer Network launch", description: `Publish and distribute ${companyName}'s customer mission` } } }],
      metadata: { bounty_id: id },
      success_url: `${origin}/launch/success?bounty=${id}&key=${encodeURIComponent(ownerKey)}&integration=${encodeURIComponent(integrationKey)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create?cancelled=1`,
    });
    await query("UPDATE bounties SET stripe_session_id=$2 WHERE id=$1", [id, session.id]);
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
