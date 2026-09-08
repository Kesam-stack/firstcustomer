import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { stripe } from "@/lib/stripe";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

function connectError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Connect") || message.includes("signed up for Connect")) {
    return "Stripe Connect is not enabled yet. The platform has to turn on Connect before referrers can receive automatic payouts.";
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
      payout_mode: string;
    }>(
      `SELECT r.id, r.manage_secret_hash, r.contact_email, r.stripe_account_id, b.payout_mode
         FROM referrals r JOIN bounties b ON b.id=r.bounty_id
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

    let account = row.stripe_account_id;
    if (!account) {
      const created = await stripe().accounts.create({
        type: "express",
        email: row.contact_email || undefined,
        capabilities: { transfers: { requested: true } },
        metadata: { referral_id: row.id },
      });
      account = created.id;
      await query("UPDATE referrals SET stripe_account_id=$2 WHERE id=$1", [row.id, account]);
    }

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
