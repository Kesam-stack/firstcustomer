import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { requireString } from "@/lib/validation";
import { attemptAutomaticPayout } from "@/lib/payouts";
import { limitOrThrow } from "@/lib/rateLimit";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerKey = req.headers.get("x-owner-key") || "";
  const auth = await query<{ owner_secret_hash: string; payout_mode: string }>("SELECT owner_secret_hash, payout_mode FROM bounties WHERE id=$1", [id]);
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
      const lock = await db.query<{ approved_count: number; goal_count: number; reward_cents: number; payout_mode: string }>(
        "SELECT approved_count,goal_count,reward_cents,payout_mode FROM bounties WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!lock.rows[0] || lock.rows[0].approved_count >= lock.rows[0].goal_count) throw new Error("Campaign goal is complete.");
      const referral = await db.query("SELECT id FROM referrals WHERE id=$1 AND bounty_id=$2", [referralId, id]);
      if (!referral.rows[0]) throw new Error("Referral not found.");
      const payoutStatus = lock.rows[0].payout_mode === "stripe" ? "payment_pending" : "manual_due";
      const inserted = await db.query<{ id: string }>(
        "INSERT INTO conversion_claims(bounty_id,referral_id,customer_reference,status,reward_cents,payout_status,approved_at,payout_available_at) VALUES($1,$2,$3,'approved',$4,$5,NOW(),NOW() + ($6 * INTERVAL '1 day')) RETURNING id",
        [id, referralId, customerReference, lock.rows[0].reward_cents, payoutStatus, config.payoutDelayDays],
      );
      await db.query("UPDATE referrals SET approved_conversions=approved_conversions+1,earned_cents=earned_cents+$2 WHERE id=$1", [referralId, lock.rows[0].reward_cents]);
      await db.query("UPDATE bounties SET approved_count=approved_count+1,status=CASE WHEN approved_count+1>=goal_count THEN 'closed' ELSE status END WHERE id=$1", [id]);
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
    if (code === "23505") return NextResponse.json({ error: "That customer has already been recorded." }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not approve conversion" }, { status: status === 429 ? 429 : 400 });
  }
}
