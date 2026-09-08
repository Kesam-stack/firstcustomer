import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { companyIdentityFingerprint, customerIdentityFingerprint, isEmailIdentity, referrerIdentityFingerprint } from "@/lib/identity";
import { requireString } from "@/lib/validation";
import { limitOrThrow } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    limitOrThrow(req, "conversion-api", 120, 10 * 60 * 1000);

    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

    const body = await req.json();
    const slug = requireString(body.campaign, "Campaign", 120);
    const code = requireString(body.referral_code, "Referral code", 80);
    const customer = requireString(body.customer_reference, "Customer reference", 180);
    const eventId = requireString(body.event_id, "Event ID", 180);

    const b = await query<{ id: string; creator_email: string; product_url: string; integration_secret_hash: string | null }>(
      "SELECT id,creator_email,product_url,integration_secret_hash FROM bounties WHERE slug=$1",
      [slug],
    );
    const bounty = b.rows[0];
    if (!bounty?.integration_secret_hash || !safeEqualHex(bounty.integration_secret_hash, hashToken(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ref = await query<{ id: string; email_hash: string | null }>(
      `SELECT r.id,ri.email_hash
         FROM referrals r
         LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
        WHERE r.bounty_id=$1 AND r.code=$2`,
      [bounty.id, code],
    );
    const referral = ref.rows[0];
    if (!referral) return NextResponse.json({ error: "Referral not found" }, { status: 404 });

    if (isEmailIdentity(customer) && referral.email_hash && referrerIdentityFingerprint(customer) === referral.email_hash) {
      return NextResponse.json({ error: "Self-referrals are not eligible for a payout." }, { status: 409 });
    }

    const companyHash = companyIdentityFingerprint(bounty.creator_email, bounty.product_url);
    const customerFingerprint = customerIdentityFingerprint(companyHash, customer);

    const c = await query<{ id: string; status: string; fraud_status: string }>(
      `INSERT INTO conversion_claims(
          bounty_id,referral_id,customer_reference,external_event_id,status,payout_status,
          company_identity_hash,customer_fingerprint,fraud_status,fraud_score,fraud_reasons,attribution_locked_at
        )
        VALUES($1,$2,$3,$4,'pending','payment_pending',$5,$6,'clear',0,'{}',NOW())
        ON CONFLICT (bounty_id,external_event_id) WHERE external_event_id IS NOT NULL
        DO UPDATE SET external_event_id=EXCLUDED.external_event_id
        RETURNING id,status,fraud_status`,
      [bounty.id, referral.id, customer, eventId, companyHash, customerFingerprint],
    );

    return NextResponse.json({ ok: true, conversion: c.rows[0] }, { status: 202 });
  } catch (error: unknown) {
    console.error(error);
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    if (code === "23505") {
      return NextResponse.json(
        { error: "This customer is already attributed to a referral for this company." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not report conversion" },
      { status: status === 429 ? 429 : 400 },
    );
  }
}
