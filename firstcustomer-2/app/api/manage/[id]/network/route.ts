import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { distributeCampaign } from "@/lib/network";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = req.headers.get("x-owner-key") || "";
  const auth = await query<any>("SELECT owner_secret_hash,status FROM bounties WHERE id=$1", [id]);
  if (!auth.rows[0] || !key || !safeEqualHex(auth.rows[0].owner_secret_hash, hashToken(key))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.rows[0].status !== "active") return NextResponse.json({ error: "Campaign must be active" }, { status: 409 });
  const distribution = await distributeCampaign(id);
  return NextResponse.json({ ok: true, ...distribution });
}
