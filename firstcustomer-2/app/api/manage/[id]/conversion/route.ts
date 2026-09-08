import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { requireString } from "@/lib/validation";
import { attemptAutomaticPayout } from "@/lib/payouts";
import { limitOrThrow } from "@/lib/rateLimit";
import { config } from "@/lib/config";
import { companyIdentityFingerprint, customerIdentityFingerprint, isEmailIdentity, referrerIdentityFingerprint } from "@/lib/identity";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerKey = req.headers.get("x-owner-key") || "";
  const auth = await query<{ owner_secret_hash: string; payout_mode: string }>(
    "SELECT owner_secret_hash,payout_mode FROM bounties WHERE id=$1",
    [id],
  );
  const bounty = auth.rows[0];
  if (!bounty || !ownerKey || !safeEqualHex(bounty.owner_secret_hash, hashToken(ownerKey))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    limitOrThrow(req, "approve", 30, 10 * 60 * 1000);
    const body = await req.json();
    const referralId = requireString(body.referralId, "Referral", 80);
    const customerReference = requireString(body.customerReference, "Customer reference", 180);

    const conversionId = await withTransaction(async (db) => {
      const lock = await db.query<{
        approved_count: number;
        goal_count: number;
        reward_cents: number;
        payout_mode: string;
        creator_email: string;
      }>(
        "SELECT approved_count,goal_count,reward_cents,payout_mode,creator_email FROM bounties WHERE id=$1 FOR UPDATE",
        [id],
      );
      const campaign = lock.rows[0];
      if (!campaign || campaign.approved_count >= campaign.goal_count) throw new Error("Campaign goal is complete.");

      const referral = await db.query<{ id: string; email_hash: string | null }>(
        `SELECT r.id,ri.email_hash
           FROM referrals r
           LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
          WHERE r.id=$1 AND r.bounty_id=$2`,
        [referralId, id],
      );
      const ref = referral.rows[0];
      if (!ref) throw new Error("Referral not found.");

      if (isEmailIdentity(customerReference) && ref.email_hash && referrerIdentityFingerprint(customerReference) === ref.email_hash) {
        throw new Error("Self-referrals are not eligible for a payout.");
      }

      const companyHash = companyIdentityFingerprint(campaign.creator_email);
      const customerFingerprint = customerIdentityFingerprint(companyHash, customerReference);
      const payoutStatus = campaign.payout_mode === "stripe" ? "payment_pending" : "manual_due";

      const inserted = await db.query<{ id: string }>(
        `INSERT INTO conversion_claims(
            bounty_id,referral_id,customer_reference,status,reward_cents,payout_status,approved_at,payout_available_at,
            company_identity_hash,customer_fingerprint,fraud_status,fraud_score,fraud_reasons,attribution_locked_at
          )
          VALUES($1,$2,$3,'approved',$4,$5,NOW(),NOW() + ($6 * INTERVAL '1 day'),$7,$8,'clear',0,'{}',NOW())
          RETURNING id`,
        [id, referralId, customerReference, campaign.reward_cents, payoutStatus, config.payoutDelayDays, companyHash, customerFingerprint],
      );

      await db.query(
        "UPDATE referrals SET approved_conversions=approved_conversions+1,earned_cents=earned_cents+$2 WHERE id=$1",
        [referralId, campaign.reward_cents],
      );
      await db.query(
        "UPDATE bounties SET approved_count=approved_count+1,status=CASE WHEN approved_count+1>=goal_count THEN 'closed' ELSE status END WHERE id=$1",
        [id],
      );
      return inserted.rows[0].id;
    });

    const payout = bounty.payout_mode === "stripe" && config.payoutDelayDays === 0
      ? await attemptAutomaticPayout(conversionId)
      : bounty.payout_mode === "stripe"
        ? { status: "held", availableAt: new Date(Date.now() + config.payoutDelayDays * 86400000).toISOString() }
        : { status: "manual_due" };

    return NextResponse.json({ ok: true, conversionId, payout });
  } catch (error: unknown) {
    console.error(error);
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    if (code === "23505") {
      return NextResponse.json({ error: "That customer is already attributed to a referral for this company." }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not approve conversion" },
      { status: status === 429 ? 429 : 400 },
    );
  }
}
