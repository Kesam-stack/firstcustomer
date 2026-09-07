import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await query<{ product_url: string; company_name: string }>(
    `SELECT b.product_url, b.company_name
       FROM referrals r JOIN bounties b ON b.id=r.bounty_id
      WHERE r.code=$1 AND b.status IN ('active','closed') LIMIT 1`,
    [code],
  );
  const row = result.rows[0];
  if (!row) return NextResponse.redirect(new URL("/", req.url));
  await query("UPDATE referrals SET clicks=clicks+1 WHERE code=$1", [code]);
  const url = new URL(row.product_url);
  url.searchParams.set("utm_source", "firstcustomer");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", row.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  url.searchParams.set("fc_ref", code);
  return NextResponse.redirect(url);
}
