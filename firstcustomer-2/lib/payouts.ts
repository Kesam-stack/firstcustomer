import type Stripe from "stripe";
import { query } from "@/lib/db";
import { stripe } from "@/lib/stripe";

type PayoutRow = {
  id: string;
  reward_cents: number;
  conversion_status: string;
  fraud_status: string;
  payout_status: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  payout_available_at: string | null;
  company_name: string;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  platform_fee_bps: number;
  payout_mode: string;
  referral_id: string;
  stripe_account_id: string | null;
  payouts_enabled: boolean;
  referrer_risk_status: string;
};

function chargeId(pi: Stripe.PaymentIntent) {
  if (typeof pi.latest_charge === "string" && pi.latest_charge) return pi.latest_charge;
  if (pi.latest_charge && typeof pi.latest_charge === "object" && "id" in pi.latest_charge) return pi.latest_charge.id;
  return null;
}

async function loadConversion(conversionId: string) {
  const r = await query<PayoutRow>(
    `SELECT c.id,
            c.reward_cents,
            c.status conversion_status,
            c.fraud_status,
            c.payout_status,
            c.stripe_payment_intent_id,
            c.stripe_transfer_id,
            c.payout_available_at::text,
            b.company_name,
            b.stripe_customer_id,
            b.stripe_payment_method_id,
            b.platform_fee_bps,
            b.payout_mode,
            r.id referral_id,
            COALESCE(ri.stripe_account_id,r.stripe_account_id) stripe_account_id,
            COALESCE(ri.payouts_enabled,r.payouts_enabled) payouts_enabled,
            COALESCE(ri.risk_status,'clear') referrer_risk_status
       FROM conversion_claims c
       JOIN bounties b ON b.id=c.bounty_id
       JOIN referrals r ON r.id=c.referral_id
       LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
      WHERE c.id=$1`,
    [conversionId],
  );
  return r.rows[0] ?? null;
}

async function markFailed(conversionId: string, message: string) {
  await query(
    `UPDATE conversion_claims
        SET payout_status='failed',payout_error=$2
      WHERE id=$1 AND payout_status <> 'paid'`,
    [conversionId, message.slice(0, 500)],
  );
  await query(
    "INSERT INTO payout_events(conversion_id,event_type,detail) VALUES($1,'failed',$2)",
    [conversionId, message.slice(0, 500)],
  );
}

async function markRiskHold(conversionId: string, message: string) {
  await query(
    `UPDATE conversion_claims
        SET payout_status='payment_pending',payout_error=$2
      WHERE id=$1 AND payout_status <> 'paid'`,
    [conversionId, message.slice(0, 500)],
  );
  await query(
    "INSERT INTO payout_events(conversion_id,event_type,detail) VALUES($1,'risk_hold',$2)",
    [conversionId, message.slice(0, 500)],
  );
}

async function getOrCreatePaymentIntent(row: PayoutRow, amount: number) {
  const api = stripe();
  if (row.stripe_payment_intent_id) {
    const existing = await api.paymentIntents.retrieve(row.stripe_payment_intent_id, { expand: ["latest_charge"] });
    if (existing.status === "succeeded" || existing.status === "processing" || existing.status === "requires_action") {
      return existing;
    }
  }

  const idempotencyKey = row.stripe_payment_intent_id
    ? `fc_pi_${row.id}_${row.stripe_payment_intent_id}`
    : `fc_pi_${row.id}`;

  return api.paymentIntents.create({
    amount,
    currency: "usd",
    customer: row.stripe_customer_id!,
    payment_method: row.stripe_payment_method_id!,
    off_session: true,
    confirm: true,
    description: `FirstCustomer reward for ${row.company_name}`,
    metadata: { conversion_id: row.id, kind: "referral_reward" },
  }, { idempotencyKey });
}

async function getOrCreateTransfer(row: PayoutRow, sourceCharge: string) {
  return stripe().transfers.create({
    amount: row.reward_cents,
    currency: "usd",
    destination: row.stripe_account_id!,
    source_transaction: sourceCharge,
    transfer_group: `fc_${row.id}`,
    metadata: { conversion_id: row.id },
  }, { idempotencyKey: `fc_tr_${row.id}` });
}

async function markPaid(row: PayoutRow, paymentIntentId: string, transferId: string) {
  const marked = await query(
    `UPDATE conversion_claims
        SET payout_status='paid',
            stripe_payment_intent_id=$2,
            stripe_transfer_id=$3,
            paid_at=COALESCE(paid_at,NOW()),
            payout_error=NULL
      WHERE id=$1 AND payout_status <> 'paid'
      RETURNING id`,
    [row.id, paymentIntentId, transferId],
  );
  if (marked.rowCount) {
    await query("UPDATE referrals SET paid_cents=paid_cents+$2 WHERE id=$1", [row.referral_id, row.reward_cents]);
    await query("INSERT INTO payout_events(conversion_id,event_type,detail) VALUES($1,'paid',$2)", [row.id, transferId]);
  }
  return { status: "paid" as const, transferId };
}

function holdUntil(iso: string | null) {
  if (!iso) return null;
  const when = Date.parse(iso);
  if (!Number.isFinite(when) || when <= Date.now()) return null;
  return iso;
}

export async function processDuePayouts(limit = 8) {
  const due = await query<{ id: string }>(
    `SELECT id
       FROM conversion_claims
      WHERE status='approved'
        AND fraud_status='clear'
        AND payout_status='payment_pending'
        AND (payout_available_at IS NULL OR payout_available_at <= NOW())
      ORDER BY payout_available_at ASC NULLS FIRST
      LIMIT $1`,
    [limit],
  );
  const results = [];
  for (const row of due.rows) {
    try {
      results.push(await attemptAutomaticPayout(row.id));
    } catch (error) {
      console.error("Due payout failed", row.id, error);
    }
  }
  return results;
}

export async function attemptAutomaticPayout(conversionId: string) {
  const row = await loadConversion(conversionId);
  if (!row) throw new Error("Conversion not found");
  if (row.payout_status === "paid") {
    return { status: "paid" as const, transferId: row.stripe_transfer_id || undefined };
  }

  if (row.conversion_status !== "approved") {
    await markRiskHold(conversionId, "Conversion is not approved for payout.");
    return { status: "not_approved" as const };
  }
  if (row.fraud_status !== "clear") {
    await markRiskHold(conversionId, `Conversion fraud status is ${row.fraud_status}.`);
    return { status: "fraud_review" as const };
  }
  if (row.referrer_risk_status !== "clear") {
    await markRiskHold(conversionId, `Referrer payout identity risk status is ${row.referrer_risk_status}.`);
    return { status: "fraud_review" as const };
  }

  const held = holdUntil(row.payout_available_at);
  if (held) {
    return { status: "held" as const, availableAt: held };
  }

  if (row.payout_mode !== "stripe" || !process.env.STRIPE_SECRET_KEY) {
    await query(
      "UPDATE conversion_claims SET payout_status='not_configured' WHERE id=$1 AND payout_status <> 'paid'",
      [conversionId],
    );
    return { status: "not_configured" as const };
  }
  if (!row.stripe_customer_id || !row.stripe_payment_method_id) {
    await query(
      "UPDATE conversion_claims SET payout_status='payment_pending',payout_error='Company payment method is not ready' WHERE id=$1 AND payout_status <> 'paid'",
      [conversionId],
    );
    return { status: "payment_pending" as const };
  }
  if (!row.stripe_account_id || !row.payouts_enabled) {
    await query(
      "UPDATE conversion_claims SET payout_status='payment_pending',payout_error='Referrer payout account is not ready' WHERE id=$1 AND payout_status <> 'paid'",
      [conversionId],
    );
    return { status: "payment_pending" as const };
  }

  if (row.stripe_payment_intent_id && row.stripe_transfer_id) {
    return markPaid(row, row.stripe_payment_intent_id, row.stripe_transfer_id);
  }

  const fee = Math.ceil(row.reward_cents * row.platform_fee_bps / 10000);
  await query(
    "UPDATE conversion_claims SET payout_status='processing',platform_fee_cents=$2,payout_error=NULL WHERE id=$1 AND payout_status <> 'paid'",
    [conversionId, fee],
  );

  try {
    const pi = await getOrCreatePaymentIntent(row, row.reward_cents + fee);
    await query(
      "UPDATE conversion_claims SET stripe_payment_intent_id=$2 WHERE id=$1 AND payout_status <> 'paid'",
      [conversionId, pi.id],
    );

    if (pi.status === "processing" || pi.status === "requires_action") {
      await query(
        "UPDATE conversion_claims SET payout_status='payment_pending',payout_error=$2 WHERE id=$1 AND payout_status <> 'paid'",
        [conversionId, `PaymentIntent is ${pi.status}`],
      );
      return { status: "payment_pending" as const };
    }
    if (pi.status !== "succeeded") {
      const message = `PaymentIntent is ${pi.status}`;
      await markFailed(conversionId, message);
      return { status: "failed" as const, error: message };
    }

    const charge = chargeId(pi);
    if (!charge) throw new Error("Payment succeeded without a charge reference");

    const transfer = await getOrCreateTransfer({ ...row, stripe_payment_intent_id: pi.id }, charge);
    return markPaid({ ...row, stripe_payment_intent_id: pi.id }, pi.id, transfer.id);
  } catch (error) {
    const paid = await query<{ payout_status: string }>(
      "SELECT payout_status FROM conversion_claims WHERE id=$1",
      [conversionId],
    );
    if (paid.rows[0]?.payout_status === "paid") return { status: "paid" as const };

    const message = error instanceof Error ? error.message : "Automatic payout failed";
    await markFailed(conversionId, message);
    return { status: "failed" as const, error: message };
  }
}
