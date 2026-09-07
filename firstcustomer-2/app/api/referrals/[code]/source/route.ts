import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { optionalXPostUrl } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const key = new URL(req.url).searchParams.get("key") || "";
  const auth = await query<{ manage_secret_hash: string | null }>("SELECT manage_secret_hash FROM referrals WHERE code=$1", [code]);
  if (!auth.rows[0]?.manage_secret_hash || !key || !safeEqualHex(auth.rows[0].manage_secret_hash, hashToken(key))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const sourcePostUrl = optionalXPostUrl(body.sourcePostUrl);
    if (!sourcePostUrl) throw new Error("Paste the X post URL for this referral.");
    await query("UPDATE referrals SET source_post_url=$2 WHERE code=$1", [code, sourcePostUrl]);
    return NextResponse.json({ ok: true, sourcePostUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save post" }, { status: 400 });
  }
}
