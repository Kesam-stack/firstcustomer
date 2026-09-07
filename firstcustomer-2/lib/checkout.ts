import type Stripe from "stripe";
import { query, withTransaction } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { distributeCampaign } from "@/lib/network";
import { config } from "@/lib/config";

function refId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

async function paymentMethodFromSession(session: Stripe.Checkout.Session) {
  const api = stripe();
  if (session.mode === "setup") {
    const setupIntent = typeof session.setup_intent === "string"
      ? await api.setupIntents.retrieve(session.setup_intent)
      : session.setup_intent;
    return {
      customer: refId(session.customer) || refId(setupIntent?.customer),
      paymentMethod: refId(setupIntent?.payment_method),
    };
  }
  const paymentIntent = typeof session.payment_intent === "string"
    ? await api.paymentIntents.retrieve(session.payment_intent)
    : session.payment_intent;
  return {
    customer: refId(session.customer) || refId(paymentIntent?.customer),
    paymentMethod: refId(paymentIntent?.payment_method),
  };
}

export async function getOrCreateStripeCustomer(bounty: { id: string; creator_email: string; company_name: string; stripe_customer_id?: string | null }) {
  if (bounty.stripe_customer_id) return bounty.stripe_customer_id;
  const existing = await query<{ stripe_customer_id: string | null }>("SELECT stripe_customer_id FROM bounties WHERE id=$1", [bounty.id]);
  if (existing.rows[0]?.stripe_customer_id) return existing.rows[0].stripe_customer_id;
  const customer = await stripe().customers.create({
    email: bounty.creator_email,
    name: bounty.company_name,
    metadata: { bounty_id: bounty.id },
  });
  await query("UPDATE bounties SET stripe_customer_id=$2 WHERE id=$1 AND stripe_customer_id IS NULL", [bounty.id, customer.id]);
  return customer.id;
}

async function applyBilling(session: Stripe.Checkout.Session, bountyId: string) {
  if (session.status && session.status !== "complete") return { ok: false as const, reason: "incomplete" };
  const details = await paymentMethodFromSession(session);
  if (!details.paymentMethod) return { ok: false as const, reason: "no_payment_method" };
  const applied = await withTransaction(async (db) => {
    const claimed = await db.query<{ session_id: string }>(
      `INSERT INTO stripe_checkout_events(session_id, bounty_id, kind)
       VALUES ($1,$2,'billing')
       ON CONFLICT (session_id) DO NOTHING
       RETURNING session_id`,
      [session.id, bountyId],
    );
    if (!claimed.rowCount) return false;
    if (details.customer || details.paymentMethod) {
      await db.query(
        `UPDATE bounties
            SET stripe_customer_id=COALESCE($2,stripe_customer_id),
                stripe_payment_method_id=COALESCE($3,stripe_payment_method_id),
                payment_verified=TRUE,
                payout_mode='stripe'
          WHERE id=$1`,
        [bountyId, details.customer, details.paymentMethod],
      );
    }
    return true;
  });
  if (!applied) return { ok: true as const, kind: "billing" as const, duplicate: true };
  return { ok: true as const, kind: "billing" as const };
}

async function applyFeatured(session: Stripe.Checkout.Session, bountyId: string) {
  if (session.payment_status !== "paid") return { ok: false as const, reason: "unpaid" };
  const details = await paymentMethodFromSession(session);
  const applied = await withTransaction(async (db) => {
    const claimed = await db.query<{ session_id: string }>(
      `INSERT INTO stripe_checkout_events(session_id, bounty_id, kind)
       VALUES ($1,$2,'featured')
       ON CONFLICT (session_id) DO NOTHING
       RETURNING session_id`,
      [session.id, bountyId],
    );
    if (!claimed.rowCount) return false;
    await db.query(
      `UPDATE bounties
          SET featured_until = GREATEST(NOW(), COALESCE(featured_until, NOW())) + ($2 * INTERVAL '1 day'),
              is_featured = TRUE,
              payment_verified = TRUE,
              stripe_customer_id = COALESCE($3, stripe_customer_id),
              stripe_payment_method_id = COALESCE($4, stripe_payment_method_id)
        WHERE id=$1`,
      [bountyId, config.featuredHoldDays, details.customer, details.paymentMethod],
    );
    return true;
  });
  if (!applied) return { ok: true as const, kind: "featured" as const, duplicate: true };
  return { ok: true as const, kind: "featured" as const };
}

async function applyLaunch(session: Stripe.Checkout.Session, bountyId: string) {
  if (session.payment_status !== "paid") return { ok: false as const, reason: "unpaid" };
  const details = await paymentMethodFromSession(session);
  const applied = await withTransaction(async (db) => {
    const claimed = await db.query<{ session_id: string }>(
      `INSERT INTO stripe_checkout_events(session_id, bounty_id, kind)
       VALUES ($1,$2,'launch')
       ON CONFLICT (session_id) DO NOTHING
       RETURNING session_id`,
      [session.id, bountyId],
    );
    if (!claimed.rowCount) return false;
    await db.query(
      `UPDATE bounties
          SET status='active',
              activated_at=COALESCE(activated_at,NOW()),
              stripe_session_id=$2,
              stripe_customer_id=COALESCE($3,stripe_customer_id),
              stripe_payment_method_id=COALESCE($4,stripe_payment_method_id),
              payment_verified=TRUE
        WHERE id=$1`,
      [bountyId, session.id, details.customer, details.paymentMethod],
    );
    return true;
  });
  if (!applied) return { ok: true as const, kind: "launch" as const, duplicate: true };
  try {
    await distributeCampaign(bountyId);
  } catch (distributionError) {
    console.error("Campaign activated but network distribution failed", distributionError);
  }
  return { ok: true as const, kind: "launch" as const };
}

export async function applyCheckoutSession(session: Stripe.Checkout.Session) {
  const bountyId = session.metadata?.bounty_id;
  if (!bountyId) return { ok: false as const, reason: "no_bounty" };
  const kind = session.metadata?.kind || (session.mode === "setup" ? "billing" : "launch");
  if (kind === "billing" || session.mode === "setup") return applyBilling(session, bountyId);
  if (kind === "featured") return applyFeatured(session, bountyId);
  return applyLaunch(session, bountyId);
}
