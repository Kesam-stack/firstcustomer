import { Pool, type QueryResultRow } from "pg";
import type { Bounty, Referral, Conversion, NetworkMember, CampaignMatch } from "@/lib/types";

const globalForDb = globalThis as unknown as { pool?: Pool };
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 8,
    });
  }
  return globalForDb.pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export const bountySelect = `id,slug,creator_email,company_name,product_url,company_description,category,company_logo_url,headline,desired_action,referral_terms,reward_cents,goal_count,approved_count,launch_fee_cents,platform_fee_bps,payout_mode,payment_verified,is_featured,network_distribution,network_matched_count,last_network_match_at::text,status,created_at::text,activated_at::text`;

export async function getBountyBySlug(slug: string): Promise<Bounty | null> {
  const r = await query<Bounty>(`SELECT ${bountySelect} FROM bounties WHERE slug=$1 LIMIT 1`, [slug]);
  return r.rows[0] ?? null;
}

export async function getBountyById(id: string): Promise<Bounty | null> {
  const r = await query<Bounty>(`SELECT ${bountySelect} FROM bounties WHERE id=$1 LIMIT 1`, [id]);
  return r.rows[0] ?? null;
}

export async function listMarketplaceBounties(limit = 12, category?: string, sort: "recommended" | "reward" | "new" | "closing" = "recommended"): Promise<Bounty[]> {
  const order = {
    recommended: "is_featured DESC,payment_verified DESC,reward_cents DESC,created_at DESC",
    reward: "reward_cents DESC,created_at DESC",
    new: "created_at DESC",
    closing: "(goal_count-approved_count) ASC,reward_cents DESC",
  }[sort];
  const values: unknown[] = [];
  let where = "status='active' AND approved_count < goal_count";
  if (category && category !== "All") {
    values.push(category);
    where += ` AND category=$${values.length}`;
  }
  values.push(limit);
  const r = await query<Bounty>(`SELECT ${bountySelect} FROM bounties WHERE ${where} ORDER BY ${order} LIMIT $${values.length}`, values);
  return r.rows;
}

export async function marketplaceStats() {
  const r = await query<{ campaigns: number; open_reward_cents: string; network_members: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM bounties WHERE status='active' AND approved_count<goal_count) campaigns,
       (SELECT COALESCE(SUM((goal_count-approved_count)*reward_cents),0)::text FROM bounties WHERE status='active' AND approved_count<goal_count) open_reward_cents,
       (SELECT COUNT(*)::int FROM network_members WHERE status='active') network_members`,
  );
  return r.rows[0] ?? { campaigns: 0, open_reward_cents: "0", network_members: 0 };
}

export async function listReferrals(bountyId: string): Promise<Referral[]> {
  const r = await query<Referral>(`SELECT id,bounty_id,code,x_handle,contact_email,clicks,approved_conversions,earned_cents,paid_cents,stripe_account_id,payouts_enabled,created_at::text FROM referrals WHERE bounty_id=$1 ORDER BY approved_conversions DESC,clicks DESC,created_at ASC`, [bountyId]);
  return r.rows;
}

export async function listConversions(bountyId: string): Promise<Conversion[]> {
  const r = await query<Conversion>(`SELECT c.id,c.referral_id,c.customer_reference,c.reward_cents,c.platform_fee_cents,c.status,c.payout_status,c.stripe_transfer_id,c.payout_error,c.created_at::text,c.paid_at::text,r.x_handle FROM conversion_claims c JOIN referrals r ON r.id=c.referral_id WHERE c.bounty_id=$1 ORDER BY c.created_at DESC`, [bountyId]);
  return r.rows;
}

export async function getReferralByCode(code: string): Promise<(Referral & { company_name: string; bounty_slug: string; headline: string; reward_cents: number; payout_mode: string }) | null> {
  const r = await query<any>(`SELECT r.id,r.bounty_id,r.code,r.x_handle,r.contact_email,r.clicks,r.approved_conversions,r.earned_cents,r.paid_cents,r.stripe_account_id,r.payouts_enabled,r.created_at::text,b.company_name,b.slug bounty_slug,b.headline,b.reward_cents,b.payout_mode FROM referrals r JOIN bounties b ON b.id=r.bounty_id WHERE r.code=$1 LIMIT 1`, [code]);
  return r.rows[0] ?? null;
}

export async function getNetworkMember(id: string): Promise<NetworkMember | null> {
  const r = await query<NetworkMember>(`SELECT id,email,x_handle,display_name,bio,categories,channels,audience_size,country,email_alerts,status,created_at::text FROM network_members WHERE id=$1 LIMIT 1`, [id]);
  return r.rows[0] ?? null;
}

export async function listMemberMatches(memberId: string, limit = 40): Promise<CampaignMatch[]> {
  const r = await query<CampaignMatch>(
    `SELECT b.${bountySelect.replaceAll(",", ",b.")},cm.id match_id,cm.score match_score,cm.reason match_reason,cm.status match_status
       FROM campaign_matches cm
       JOIN bounties b ON b.id=cm.bounty_id
      WHERE cm.member_id=$1 AND b.status='active' AND b.approved_count<b.goal_count
      ORDER BY CASE cm.status WHEN 'claimed' THEN 0 ELSE 1 END,cm.score DESC,b.reward_cents DESC,cm.created_at DESC
      LIMIT $2`,
    [memberId, limit],
  );
  return r.rows;
}

export async function networkMatchCount(bountyId: string) {
  const r = await query<{ count: number }>(`SELECT COUNT(*)::int count FROM campaign_matches WHERE bounty_id=$1`, [bountyId]);
  return r.rows[0]?.count ?? 0;
}
