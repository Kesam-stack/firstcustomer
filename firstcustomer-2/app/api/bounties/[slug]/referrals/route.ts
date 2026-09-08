import { NextResponse } from "next/server";
import { getBountyBySlug, query } from "@/lib/db";
import { cleanHandle } from "@/lib/format";
import { referralCode } from "@/lib/slug";
import { randomToken, hashToken } from "@/lib/security";
import { referrerIdentityFingerprint } from "@/lib/identity";
import { limitOrThrow } from "@/lib/rateLimit";
import { siteUrl } from "@/lib/site";
import { optionalXPostUrl } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    limitOrThrow(req, "referral", 20);
    const { slug } = await params;
    const bounty = await getBountyBySlug(slug);
    if (!bounty || bounty.status !== "active") return NextResponse.json({ error: "Campaign is not active." }, { status: 404 });

    const body = await req.json();
    const handle = cleanHandle(String(body.xHandle || ""));
    const email = String(body.contactEmail || "").trim().toLowerCase();
    if (!handle) return NextResponse.json({ error: "Enter a valid X handle." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    if (email === bounty.creator_email.toLowerCase() || (bounty.creator_x_handle && handle.toLowerCase() === bounty.creator_x_handle.toLowerCase())) {
      return NextResponse.json({ error: "You cannot refer customers to your own campaign." }, { status: 400 });
    }

    const sourcePostUrl = optionalXPostUrl(body.sourcePostUrl);
    const emailHash = referrerIdentityFingerprint(email);
    const identity = await query<{ id: string }>(
      `INSERT INTO referrer_identities(email_hash)
       VALUES($1)
       ON CONFLICT(email_hash) DO UPDATE SET updated_at=NOW()
       RETURNING id`,
      [emailHash],
    );
    const identityId = identity.rows[0].id;

    const existing = await query<{ code: string }>(
      `SELECT code
         FROM referrals
        WHERE bounty_id=$1
          AND (identity_id=$2 OR lower(x_handle)=lower($3))
        LIMIT 1`,
      [bounty.id, identityId, handle],
    );
    if (existing.rows[0]) {
      return NextResponse.json(
        { error: "You already have a referral identity for this campaign. Use your original private earnings link." },
        { status: 409 },
      );
    }

    const manageKey = randomToken(24);
    for (let i = 0; i < 5; i++) {
      try {
        const inserted = await query<{ code: string }>(
          `INSERT INTO referrals(
              bounty_id,code,manage_secret_hash,x_handle,contact_email,source_post_url,identity_id
            )
            VALUES($1,$2,$3,$4,$5,$6,$7)
            RETURNING code`,
          [bounty.id, referralCode(), hashToken(manageKey), handle, email, sourcePostUrl, identityId],
        );
        const code = inserted.rows[0].code;
        return NextResponse.json({
          shareUrl: siteUrl(`/b/${bounty.slug}?ref=${encodeURIComponent(code)}`),
          manageUrl: siteUrl(`/referrals/${encodeURIComponent(code)}?key=${encodeURIComponent(manageKey)}`),
        });
      } catch (error: unknown) {
        const pg = error as { code?: string };
        if (pg?.code !== "23505") throw error;

        const duplicateIdentity = await query<{ code: string }>(
          "SELECT code FROM referrals WHERE bounty_id=$1 AND identity_id=$2 LIMIT 1",
          [bounty.id, identityId],
        );
        if (duplicateIdentity.rows[0]) {
          return NextResponse.json(
            { error: "You already have a referral identity for this campaign. Use your original private earnings link." },
            { status: 409 },
          );
        }
      }
    }

    throw new Error("Could not create referral");
  } catch (error) {
    console.error(error);
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create referral link." },
      { status: status === 429 ? 429 : 400 },
    );
  }
}
