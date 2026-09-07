import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const botPattern = /bot|crawl|spider|slurp|preview|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|telegram|discord|pinterest|applebot|bingpreview|embedly|quora|vkshare/i;

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = (await query<{ referral_id: string; bounty_id: string; product_url: string; company_name: string; status: string }>(
    `SELECT r.id referral_id,r.bounty_id,b.product_url,b.company_name,b.status
       FROM referrals r JOIN bounties b ON b.id=r.bounty_id WHERE r.code=$1 LIMIT 1`,
    [code],
  )).rows[0];
  if (!row || !["active", "closed"].includes(row.status)) return NextResponse.redirect(new URL("/", req.url));

  const ua = req.headers.get("user-agent")?.slice(0, 500) || "";
  const isBot = botPattern.test(ua);
  if (!isBot) {
    await query("UPDATE referrals SET clicks=clicks+1 WHERE id=$1", [row.referral_id]);
    await query("INSERT INTO referral_clicks(referral_id,bounty_id,referrer,user_agent) VALUES($1,$2,$3,$4)", [
      row.referral_id,
      row.bounty_id,
      req.headers.get("referer")?.slice(0, 500) || null,
      ua || null,
    ]);
  }

  const url = new URL(row.product_url);
  url.searchParams.set("utm_source", "firstcustomer");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", row.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  url.searchParams.set("fc_ref", code);
  return NextResponse.redirect(url);
}
