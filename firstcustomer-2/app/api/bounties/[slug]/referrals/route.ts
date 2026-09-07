import { NextResponse } from "next/server";
import { getBountyBySlug, query } from "@/lib/db";
import { cleanHandle } from "@/lib/format";
import { referralCode } from "@/lib/slug";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const bounty = await getBountyBySlug(slug);
    if (!bounty || bounty.status !== "active") return NextResponse.json({ error: "This bounty is not active." }, { status: 404 });

    const body = await req.json();
    const handle = cleanHandle(String(body.xHandle || ""));
    if (!handle) return NextResponse.json({ error: "Enter a valid X handle." }, { status: 400 });
    const contactEmail = typeof body.contactEmail === "string" && body.contactEmail.trim() ? body.contactEmail.trim().toLowerCase().slice(0, 254) : null;
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

    // Reuse a referral for the same handle on the same bounty instead of creating duplicates.
    let result = await query<{ code: string }>("SELECT code FROM referrals WHERE bounty_id=$1 AND lower(x_handle)=lower($2) LIMIT 1", [bounty.id, handle]);
    if (!result.rows[0]) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          result = await query<{ code: string }>(
            "INSERT INTO referrals (bounty_id, code, x_handle, contact_email) VALUES ($1,$2,$3,$4) RETURNING code",
            [bounty.id, referralCode(), handle, contactEmail],
          );
          break;
        } catch (e: any) {
          if (e?.code !== "23505") throw e;
        }
      }
    }
    const code = result.rows[0]?.code;
    if (!code) throw new Error("Could not generate referral code");
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.json({ code, shareUrl: `${origin}/b/${bounty.slug}?ref=${encodeURIComponent(code)}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create referral link." }, { status: 400 });
  }
}
