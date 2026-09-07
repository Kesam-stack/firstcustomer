import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, randomToken, safeEqualHex } from "@/lib/security";
import { referralCode } from "@/lib/slug";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const privateKey = req.headers.get("x-network-key") || "";
  const memberResult = await query<any>("SELECT id,manage_secret_hash,email,x_handle FROM network_members WHERE id=$1 AND status='active'", [id]);
  const member = memberResult.rows[0];
  if (!member || !privateKey || !safeEqualHex(member.manage_secret_hash, hashToken(privateKey))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const matchId = String(body.matchId || "");
    const matchResult = await query<any>(`SELECT cm.id,cm.status match_status,b.id bounty_id,b.slug,b.status bounty_status FROM campaign_matches cm JOIN bounties b ON b.id=cm.bounty_id WHERE cm.id=$1 AND cm.member_id=$2`, [matchId, id]);
    const match = matchResult.rows[0];
    if (!match || match.match_status === "declined") return NextResponse.json({ error: "Mission not available" }, { status: 404 });
    if (match.bounty_status !== "active") return NextResponse.json({ error: "Campaign is closed" }, { status: 409 });
    if (!member.x_handle) return NextResponse.json({ error: "Add an X handle when joining the network before claiming a mission." }, { status: 400 });

    const manageKey = randomToken(28);
    let referral = await query<any>("SELECT id,code FROM referrals WHERE bounty_id=$1 AND lower(x_handle)=lower($2) AND lower(contact_email)=lower($3) LIMIT 1", [match.bounty_id, member.x_handle, member.email]);
    if (referral.rows[0]) {
      await query("UPDATE referrals SET manage_secret_hash=$2 WHERE id=$1", [referral.rows[0].id, hashToken(manageKey)]);
    } else {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          referral = await query<any>("INSERT INTO referrals(bounty_id,code,manage_secret_hash,x_handle,contact_email) VALUES($1,$2,$3,$4,$5) RETURNING id,code", [match.bounty_id, referralCode(), hashToken(manageKey), member.x_handle, member.email]);
          break;
        } catch (error: any) {
          if (error?.code !== "23505") throw error;
        }
      }
    }
    const code = referral.rows[0]?.code;
    if (!code) throw new Error("Could not create referral link");
    await query("UPDATE campaign_matches SET status='claimed',claimed_at=COALESCE(claimed_at,NOW()) WHERE id=$1", [matchId]);
    return NextResponse.json({ shareUrl: siteUrl(`/b/${match.slug}?ref=${encodeURIComponent(code)}`), manageUrl: siteUrl(`/referrals/${encodeURIComponent(code)}?key=${encodeURIComponent(manageKey)}`) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not claim mission" }, { status: 400 });
  }
}
