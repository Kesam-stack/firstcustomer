import { NextResponse } from "next/server";
import { getBountyBySlug, query } from "@/lib/db";
import { cleanHandle } from "@/lib/format";
import { referralCode } from "@/lib/slug";
import { randomToken, hashToken } from "@/lib/security";
import { limitOrThrow } from "@/lib/rateLimit";

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
    if (email === bounty.creator_email.toLowerCase()) {
      return NextResponse.json({ error: "You cannot refer customers to your own campaign." }, { status: 400 });
    }

    const existing = await query<{ code: string }>(
      "SELECT code FROM referrals WHERE bounty_id=$1 AND lower(x_handle)=lower($2) LIMIT 1",
      [bounty.id, handle],
    );
    if (existing.rows[0]) {
      return NextResponse.json({ error: "A referral already exists for this handle. Use your original private earnings link." }, { status: 409 });
    }

    const manageKey = randomToken(24);
    let code = "";
    for (let i = 0; i < 5; i++) {
      try {
        const inserted = await query<{ code: string }>(
          "INSERT INTO referrals(bounty_id,code,manage_secret_hash,x_handle,contact_email) VALUES($1,$2,$3,$4,$5) RETURNING code",
          [bounty.id, referralCode(), hashToken(manageKey), handle, email],
        );
        code = inserted.rows[0].code;
        break;
      } catch (error: unknown) {
        const pg = error as { code?: string };
        if (pg?.code !== "23505") throw error;
      }
    }
    if (!code) throw new Error("Could not create referral");
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.json({
      shareUrl: `${origin}/b/${bounty.slug}?ref=${encodeURIComponent(code)}`,
      manageUrl: `${origin}/referrals/${encodeURIComponent(code)}?key=${encodeURIComponent(manageKey)}`,
    });
  } catch (error) {
    console.error(error);
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create referral link." }, { status: status === 429 ? 429 : 400 });
  }
}
