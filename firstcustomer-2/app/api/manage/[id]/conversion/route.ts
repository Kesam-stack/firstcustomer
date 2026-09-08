import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { requireString } from "@/lib/validation";
import { attemptAutomaticPayout } from "@/lib/payouts";
import { limitOrThrow } from "@/lib/rateLimit";
import { config } from "@/lib/config";
import { companyIdentityFingerprint, customerIdentityFingerprint, isEmailIdentity, referrerIdentityFingerprint } from "@/lib/identity";

export const runtime = "nodejs";

type ApprovalResult = {
  conversionId: string;
  fraudStatus: "clear" | "review" | "blocked";
  alreadyApproved: boolean;
};

async function needsFirstPayoutReview(db: import("pg").PoolClient, identityId: string | null) {
  if (!identityId) return false;
  const prior = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int count
       FROM conversion_claims c
       JOIN referrals r ON r.id=c.referral_id
      WHERE r.identity_id=$1
        AND c.payout_status='paid'`,
    [identityId],
  );
  return (prior.rows[0]?.count ?? 0) === 0;
}

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
    const reportedConversionId = body.conversionId
      ? requireString(body.conversionId, "Conversion", 80)
      : null;

    const approval = await withTransaction<ApprovalResult>(async (db) => {
      const lock = await db.query<{
        approved_count: number;
        goal_count: number;
        reward_cents: number;
        payout_mode: string;
        creator_email: string;
        product_url: string;
      }>(
        "SELECT approved_count,goal_count,reward_cents,payout_mode,creator_email,product_url FROM bounties WHERE id=$1 FOR UPDATE",
        [id],
      );
      const campaign = lock.rows[0];
      if (!campaign) throw new Error("Campaign not found.");

      if (reportedConversionId) {
        const existing = await db.query<{
          id: string;
          referral_id: string;
          customer_reference: string;
          status: "pending" | "approved" | "rejected";
          fraud_status: "clear" | "review" | "blocked";
          identity_id: string | null;
          email_hash: string | null;
        }>(
          `SELECT c.id,c.referral_id,c.customer_reference,c.status,c.fraud_status,r.identity_id,ri.email_hash
             FROM conversion_claims c
             JOIN referrals r ON r.id=c.referral_id
             LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
            WHERE c.id=$1 AND c.bounty_id=$2
            FOR UPDATE OF c`,
          [reportedConversionId, id],
        );
        const conversion = existing.rows[0];
        if (!conversion) throw new Error("Conversion not found.");
        if (conversion.status === "rejected") throw new Error("Rejected conversions cannot be approved.");
        if (conversion.status === "approved") {
          return {
            conversionId: conversion.id,
            fraudStatus: conversion.fraud_status,
            alreadyApproved: true,
          };
        }
        if (campaign.approved_count >= campaign.goal_count) throw new Error("Campaign goal is complete.");

        if (
          isEmailIdentity(conversion.customer_reference) &&
          conversion.email_hash &&
          referrerIdentityFingerprint(conversion.customer_reference) === conversion.email_hash
        ) {
          throw new Error("Self-referrals are not eligible for a payout.");
        }

        const firstPayoutReview = await needsFirstPayoutReview(db, conversion.identity_id);
        const fraudStatus: "clear" | "review" | "blocked" =
          conversion.fraud_status === "blocked"
            ? "blocked"
            : conversion.fraud_status === "review" || firstPayoutReview
              ? "review"
              : "clear";
        const payoutStatus = campaign.payout_mode === "stripe" ? "payment_pending" : "manual_due";

        await db.query(
          `UPDATE conversion_claims
              SET status='approved',
                  reward_cents=$2,
                  payout_status=$3,
                  approved_at=COALESCE(approved_at,NOW()),
                  payout_available_at=COALESCE(payout_available_at,NOW() + ($4 * INTERVAL '1 day')),
                  fraud_status=$5,
                  fraud_score=GREATEST(fraud_score,$6),
                  fraud_reasons=CASE
                    WHEN $7
                     AND NOT ('first_payout_review'=ANY(fraud_reasons))
                    THEN array_append(fraud_reasons,'first_payout_review')
                    ELSE fraud_reasons
                  END
            WHERE id=$1`,
          [
            conversion.id,
            campaign.reward_cents,
            payoutStatus,
            config.payoutDelayDays,
            fraudStatus,
            firstPayoutReview ? 20 : 0,
            firstPayoutReview,
          ],
        );

        await db.query(
          "UPDATE referrals SET approved_conversions=approved_conversions+1,earned_cents=earned_cents+$2 WHERE id=$1",
          [conversion.referral_id, campaign.reward_cents],
        );
        await db.query(
          "UPDATE bounties SET approved_count=approved_count+1,status=CASE WHEN approved_count+1>=goal_count THEN 'closed' ELSE status END WHERE id=$1",
          [id],
        );

        return {
          conversionId: conversion.id,
          fraudStatus,
          alreadyApproved: false,
        };
      }

      if (campaign.approved_count >= campaign.goal_count) throw new Error("Campaign goal is complete.");

      const referralId = requireString(body.referralId, "Referral", 80);
      const customerReference = requireString(body.customerReference, "Customer reference", 180);
      const referral = await db.query<{
        id: string;
        identity_id: string | null;
        email_hash: string | null;
      }>(
        `SELECT r.id,r.identity_id,ri.email_hash
           FROM referrals r
           LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
          WHERE r.id=$1 AND r.bounty_id=$2`,
        [referralId, id],
      );
      const ref = referral.rows[0];
      if (!ref) throw new Error("Referral not found.");

      if (
        isEmailIdentity(customerReference) &&
        ref.email_hash &&
        referrerIdentityFingerprint(customerReference) === ref.email_hash
      ) {
        throw new Error("Self-referrals are not eligible for a payout.");
      }

      const companyHash = companyIdentityFingerprint(campaign.creator_email, campaign.product_url);
      const customerFingerprint = customerIdentityFingerprint(companyHash, customerReference);
      const firstPayoutReview = await needsFirstPayoutReview(db, ref.identity_id);
      const fraudStatus: "clear" | "review" = firstPayoutReview ? "review" : "clear";
      const payoutStatus = campaign.payout_mode === "stripe" ? "payment_pending" : "manual_due";
      const fraudReasons = firstPayoutReview ? ["first_payout_review"] : [];

      const inserted = await db.query<{ id: string }>(
        `INSERT INTO conversion_claims(
            bounty_id,referral_id,customer_reference,status,reward_cents,payout_status,approved_at,payout_available_at,
            company_identity_hash,customer_fingerprint,fraud_status,fraud_score,fraud_reasons,attribution_locked_at
          )
          VALUES($1,$2,$3,'approved',$4,$5,NOW(),NOW() + ($6 * INTERVAL '1 day'),$7,$8,$9,$10,$11::text[],NOW())
          RETURNING id`,
        [
          id,
          referralId,
          customerReference,
          campaign.reward_cents,
          payoutStatus,
          config.payoutDelayDays,
          companyHash,
          customerFingerprint,
          fraudStatus,
          firstPayoutReview ? 20 : 0,
          fraudReasons,
        ],
      );

      await db.query(
        "UPDATE referrals SET approved_conversions=approved_conversions+1,earned_cents=earned_cents+$2 WHERE id=$1",
        [referralId, campaign.reward_cents],
      );
      await db.query(
        "UPDATE bounties SET approved_count=approved_count+1,status=CASE WHEN approved_count+1>=goal_count THEN 'closed' ELSE status END WHERE id=$1",
        [id],
      );

      return {
        conversionId: inserted.rows[0].id,
        fraudStatus,
        alreadyApproved: false,
      };
    });

    let payout:
      | { status: string; availableAt?: string; transferId?: string; error?: string }
      | Awaited<ReturnType<typeof attemptAutomaticPayout>>;

    if (approval.fraudStatus !== "clear") {
      payout = { status: "fraud_review" };
    } else if (bounty.payout_mode === "stripe" && config.payoutDelayDays === 0) {
      payout = await attemptAutomaticPayout(approval.conversionId);
    } else if (bounty.payout_mode === "stripe") {
      payout = {
        status: "held",
        availableAt: new Date(Date.now() + config.payoutDelayDays * 86400000).toISOString(),
      };
    } else {
      payout = { status: "manual_due" };
    }

    return NextResponse.json({
      ok: true,
      conversionId: approval.conversionId,
      alreadyApproved: approval.alreadyApproved,
      fraudStatus: approval.fraudStatus,
      payout,
    });
  } catch (error: unknown) {
    console.error(error);
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    if (code === "23505") {
      return NextResponse.json(
        { error: "That customer is already attributed to a referral for this company." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not approve conversion" },
      { status: status === 429 ? 429 : 400 },
    );
  }
}
