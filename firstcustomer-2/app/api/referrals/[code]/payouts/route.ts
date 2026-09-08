import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { referrerIdentityFingerprint } from "@/lib/identity";
import { stripe } from "@/lib/stripe";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

function connectError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Connect") || message.includes("signed up for Connect")) {
    return "Stripe Connect is not enabled yet. The platform has to turn on Connect before referrers can receive automatic payouts.";
  }
  if (message.includes("duplicate key") || message.includes("unique")) {
    return "This payout account is already linked to another FirstCustomer identity.";
  }
  return message || "Could not start Stripe onboarding.";
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const key = new URL(req.url).searchParams.get("key") || "";
  const origin = publicOrigin(req);
  const back = `${origin}/referrals/${encodeURIComponent(code)}?key=${encodeURIComponent(key)}`;

  try {
    const r = await query<{
      id: string;
      manage_secret_hash: string | null;
      contact_email: string | null;
      stripe_account_id: string | null;
      identity_id: string | null;
      payout_mode: string;
      identity_stripe_account_id: string | null;
      identity_risk_status: string | null;
    }>(
      `SELECT r.id,r.manage_secret_hash,r.contact_email,r.stripe_account_id,r.identity_id,b.payout_mode,
              ri.stripe_account_id identity_stripe_account_id,
              ri.risk_status identity_risk_status
         FROM referrals r
         JOIN bounties b ON b.id=r.bounty_id
         LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
        WHERE r.code=$1`,
      [code],
    );
    const row = r.rows[0];
    if (!row || !key || !row.manage_secret_hash || !safeEqualHex(row.manage_secret_hash, hashToken(key))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (row.payout_mode !== "stripe") {
      return NextResponse.redirect(`${back}&error=${encodeURIComponent("Automatic payouts are not enabled for this campaign.")}`, 303);
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.redirect(`${back}&error=${encodeURIComponent("Payments are not configured.")}`, 303);
    }
    if (!row.contact_email) {
      return NextResponse.redirect(`${back}&error=${encodeURIComponent("A verified payout email is required.")}`, 303);
    }

    let identityId = row.identity_id;
    let identityAccount = row.identity_stripe_account_id;
    let identityRisk = row.identity_risk_status;

    if (!identityId) {
      const emailHash = referrerIdentityFingerprint(row.contact_email);
      const identity = await query<{ id: string; stripe_account_id: string | null; risk_status: string }>(
        `INSERT INTO referrer_identities(email_hash)
         VALUES($1)
         ON CONFLICT(email_hash) DO UPDATE SET updated_at=NOW()
         RETURNING id,stripe_account_id,risk_status`,
        [emailHash],
      );
      identityId = identity.rows[0].id;
      identityAccount = identity.rows[0].stripe_account_id;
      identityRisk = identity.rows[0].risk_status;
      await query("UPDATE referrals SET identity_id=$2 WHERE id=$1", [row.id, identityId]);
    }

    if (identityRisk && identityRisk !== "clear") {
      return NextResponse.redirect(
        `${back}&error=${encodeURIComponent("This payout identity requires review before payouts can be enabled.")}`,
        303,
      );
    }

    let account = identityAccount || row.stripe_account_id;
    if (account && !identityAccount) {
      await query(
        "UPDATE referrer_identities SET stripe_account_id=$2,updated_at=NOW() WHERE id=$1",
        [identityId, account],
      );
    }

    if (!account) {
      const created = await stripe().accounts.create({
        type: "express",
        email: row.contact_email,
        capabilities: { transfers: { requested: true } },
        metadata: { referrer_identity_id: identityId, referral_id: row.id },
      });
      account = created.id;
      await query(
        "UPDATE referrer_identities SET stripe_account_id=$2,updated_at=NOW() WHERE id=$1",
        [identityId, account],
      );
    }

    await query(
      "UPDATE referrals SET stripe_account_id=$2 WHERE identity_id=$1",
      [identityId, account],
    );

    const link = await stripe().accountLinks.create({
      account,
      refresh_url: back,
      return_url: back,
      type: "account_onboarding",
    });
    return NextResponse.redirect(link.url, 303);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${back}&error=${encodeURIComponent(connectError(error))}`, 303);
  }
}
