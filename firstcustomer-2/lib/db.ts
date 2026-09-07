import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { Bounty, Referral, Conversion, NetworkMember, CampaignMatch, Rainmaker } from "@/lib/types";
import { config } from "@/lib/config";

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

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
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
  const fundedFirst = "(CASE WHEN payment_verified AND payout_mode='stripe' THEN 0 ELSE 1 END)";
  const order = {
    recommended: `${fundedFirst},is_featured DESC,reward_cents DESC,created_at DESC`,
    reward: `${fundedFirst},reward_cents DESC,created_at ASC`,
    new: "created_at DESC",
    closing: `${fundedFirst},(goal_count-approved_count) ASC,reward_cents DESC`,
  }[sort];
  const values: unknown[] = [];
  let where = "status='active' AND approved_count < goal_count";
  if (category && category !== "All") {
    values.push(category);
    where += ` AND category=$${values.length}`;
  }
  values.push(limit);
  const r = await query<Bounty>(
    `SELECT ${bountySelect},
            COALESCE((SELECT SUM(clicks)::int FROM referrals WHERE bounty_id=bounties.id),0) click_count,
            COALESCE((SELECT COUNT(*)::int FROM referrals WHERE bounty_id=bounties.id),0) referrer_count
       FROM bounties WHERE ${where} ORDER BY ${order} LIMIT $${values.length}`,
    values,
  );
  return r.rows;
}

const fundedLive = `status='active' AND approved_count<goal_count AND payment_verified AND payout_mode='stripe'`;

export async function marketplaceStats() {
  const r = await query<{ campaigns: number; open_reward_cents: string; network_members: number; highest_reward_cents: string; click_count: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM bounties WHERE status='active' AND approved_count<goal_count) campaigns,
       (SELECT COALESCE(SUM((goal_count-approved_count)*reward_cents),0)::text FROM bounties WHERE ${fundedLive}) open_reward_cents,
       (SELECT COUNT(*)::int FROM network_members WHERE status='active') network_members,
       (SELECT COALESCE(MAX(reward_cents),0)::text FROM bounties WHERE ${fundedLive}) highest_reward_cents,
       (SELECT COALESCE(SUM(r.clicks),0)::int FROM referrals r JOIN bounties b ON b.id=r.bounty_id WHERE b.status='active' AND b.approved_count<b.goal_count) click_count`,
  );
  return r.rows[0] ?? { campaigns: 0, open_reward_cents: "0", network_members: 0, highest_reward_cents: "0", click_count: 0 };
}

export async function getBountyRank(bounty: Bounty): Promise<number | null> {
  if (bounty.status !== "active" || bounty.approved_count >= bounty.goal_count) return null;
  if (!bounty.payment_verified || bounty.payout_mode !== "stripe") return null;
  const r = await query<{ rank: number }>(
    `SELECT COUNT(*)::int + 1 AS rank FROM bounties
      WHERE status='active' AND approved_count < goal_count
        AND payment_verified AND payout_mode='stripe'
        AND (reward_cents > $1
          OR (reward_cents = $1 AND created_at < $2)
          OR (reward_cents = $1 AND created_at = $2 AND id < $3))`,
    [bounty.reward_cents, bounty.created_at, bounty.id],
  );
  return r.rows[0]?.rank ?? null;
}

export async function bountyTraffic(bountyId: string) {
  const r = await query<{ click_count: number; referrer_count: number }>(
    `SELECT COALESCE(SUM(clicks),0)::int click_count, COUNT(*)::int referrer_count FROM referrals WHERE bounty_id=$1`,
    [bountyId],
  );
  return r.rows[0] ?? { click_count: 0, referrer_count: 0 };
}

export async function listRainmakers(limit = 8): Promise<Rainmaker[]> {
  const r = await query<Rainmaker>(
    `SELECT MIN(x_handle) x_handle,
            SUM(approved_conversions)::int approved,
            SUM(paid_cents)::int paid_cents,
            SUM(earned_cents)::int earned_cents
       FROM referrals
      GROUP BY lower(x_handle)
     HAVING SUM(approved_conversions) >= $1
      ORDER BY SUM(paid_cents) DESC, SUM(approved_conversions) DESC
      LIMIT $2`,
    [config.rainmakerThreshold, limit],
  );
  return r.rows;
}

export type PublicPayout = {
  paid_at: string;
  reward_cents: number;
  company_name: string;
  slug: string;
  x_handle: string;
  total_approved: number;
  rainmaker: boolean;
};

export async function listPublicPayouts(limit = 12): Promise<PublicPayout[]> {
  const r = await query<PublicPayout>(
    `SELECT c.paid_at::text,
            c.reward_cents,
            b.company_name,
            b.slug,
            r.x_handle,
            COALESCE((
              SELECT SUM(r2.approved_conversions)::int
              FROM referrals r2
              WHERE lower(r2.x_handle)=lower(r.x_handle)
            ),0) total_approved,
            COALESCE((
              SELECT SUM(r3.approved_conversions)
              FROM referrals r3
              WHERE lower(r3.x_handle)=lower(r.x_handle)
            ),0) >= $2 rainmaker
       FROM conversion_claims c
       JOIN bounties b ON b.id=c.bounty_id
       JOIN referrals r ON r.id=c.referral_id
      WHERE c.payout_status='paid' AND c.paid_at IS NOT NULL
      ORDER BY c.paid_at DESC
      LIMIT $1`,
    [limit, config.rainmakerThreshold],
  );
  return r.rows;
}

export async function publicLedgerStats() {
  const r = await query<{ total_paid_cents: string; payout_count: number; companies_paid: number }>(
    `SELECT
      COALESCE(SUM(reward_cents),0)::text total_paid_cents,
      COUNT(*)::int payout_count,
      COUNT(DISTINCT bounty_id)::int companies_paid
     FROM conversion_claims
     WHERE payout_status='paid' AND paid_at IS NOT NULL`,
  );
  return r.rows[0] ?? { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };
}

export async function listReferrals(bountyId: string): Promise<Referral[]> {
  const r = await query<Referral>(`SELECT id,bounty_id,code,x_handle,contact_email,clicks,approved_conversions,earned_cents,paid_cents,stripe_account_id,payouts_enabled,created_at::text FROM referrals WHERE bounty_id=$1 ORDER BY approved_conversions DESC,clicks DESC,created_at ASC`, [bountyId]);
  return r.rows;
}

export async function listConversions(bountyId: string): Promise<Conversion[]> {
  const r = await query<Conversion>(`SELECT c.id,c.referral_id,c.customer_reference,c.reward_cents,c.platform_fee_cents,c.status,c.payout_status,c.stripe_transfer_id,c.payout_error,c.created_at::text,c.paid_at::text,r.x_handle FROM conversion_claims c JOIN referrals r ON r.id=c.referral_id WHERE c.bounty_id=$1 ORDER BY c.created_at DESC`, [bountyId]);
  return r.rows;
}

export async function getReferralByCode(code: string): Promise<(Referral & { company_name: string; bounty_slug: string; headline: string; reward_cents: number; payout_mode: string; global_approved: number }) | null> {
  const r = await query<any>(`SELECT r.id,r.bounty_id,r.code,r.x_handle,r.contact_email,r.clicks,r.approved_conversions,r.earned_cents,r.paid_cents,r.stripe_account_id,r.payouts_enabled,r.created_at::text,b.company_name,b.slug bounty_slug,b.headline,b.reward_cents,b.payout_mode,COALESCE((SELECT SUM(r2.approved_conversions)::int FROM referrals r2 WHERE lower(r2.x_handle)=lower(r.x_handle)),0) global_approved FROM referrals r JOIN bounties b ON b.id=r.bounty_id WHERE r.code=$1 LIMIT 1`, [code]);
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

export async function adminOverview() {
  const r = await query<{
    campaigns: number;
    active: number;
    drafts: number;
    paused: number;
    closed: number;
    referrals: number;
    members: number;
    conversions: number;
    paid: number;
    failed: number;
    pending: number;
    paid_cents: string;
    launch_fees_cents: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::int FROM bounties) campaigns,
      (SELECT COUNT(*)::int FROM bounties WHERE status='active') active,
      (SELECT COUNT(*)::int FROM bounties WHERE status='draft') drafts,
      (SELECT COUNT(*)::int FROM bounties WHERE status='paused') paused,
      (SELECT COUNT(*)::int FROM bounties WHERE status='closed') closed,
      (SELECT COUNT(*)::int FROM referrals) referrals,
      (SELECT COUNT(*)::int FROM network_members) members,
      (SELECT COUNT(*)::int FROM conversion_claims) conversions,
      (SELECT COUNT(*)::int FROM conversion_claims WHERE payout_status='paid') paid,
      (SELECT COUNT(*)::int FROM conversion_claims WHERE payout_status='failed') failed,
      (SELECT COUNT(*)::int FROM conversion_claims WHERE payout_status IN ('payment_pending','processing','manual_due')) pending,
      (SELECT COALESCE(SUM(reward_cents),0)::text FROM conversion_claims WHERE payout_status='paid') paid_cents,
      (SELECT COALESCE(SUM(launch_fee_cents),0)::text FROM bounties WHERE payment_verified) launch_fees_cents`,
  );
  return r.rows[0];
}

export async function adminListCampaigns(status?: string, q?: string) {
  const values: unknown[] = [];
  const where: string[] = [];
  if (status && ["draft", "active", "paused", "closed"].includes(status)) {
    values.push(status);
    where.push(`status=$${values.length}`);
  }
  if (q) {
    values.push(`%${q}%`);
    where.push(`(company_name ILIKE $${values.length} OR slug ILIKE $${values.length} OR creator_email ILIKE $${values.length})`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const r = await query<Bounty & { click_count: number; referrer_count: number }>(
    `SELECT ${bountySelect},
            COALESCE((SELECT SUM(clicks)::int FROM referrals WHERE bounty_id=bounties.id),0) click_count,
            COALESCE((SELECT COUNT(*)::int FROM referrals WHERE bounty_id=bounties.id),0) referrer_count
       FROM bounties ${clause}
      ORDER BY created_at DESC
      LIMIT 200`,
    values,
  );
  return r.rows;
}

export type AdminPayout = Conversion & { company_name: string; slug: string; payout_mode: string; bounty_id: string };

export async function adminListPayouts(status?: string) {
  const values: unknown[] = [];
  let where = "";
  if (status) {
    values.push(status);
    where = `WHERE c.payout_status=$${values.length}`;
  }
  const r = await query<AdminPayout>(
    `SELECT c.id,c.referral_id,c.customer_reference,c.reward_cents,c.platform_fee_cents,c.status,c.payout_status,
            c.stripe_transfer_id,c.payout_error,c.created_at::text,c.paid_at::text,r.x_handle,
            b.company_name,b.slug,b.payout_mode,c.bounty_id
       FROM conversion_claims c
       JOIN referrals r ON r.id=c.referral_id
       JOIN bounties b ON b.id=c.bounty_id
       ${where}
      ORDER BY c.created_at DESC
      LIMIT 200`,
    values,
  );
  return r.rows;
}

export type AdminReferral = Referral & { company_name: string; slug: string };

export async function adminListReferrals() {
  const r = await query<AdminReferral>(
    `SELECT r.id,r.bounty_id,r.code,r.x_handle,r.contact_email,r.clicks,r.approved_conversions,r.earned_cents,r.paid_cents,
            r.stripe_account_id,r.payouts_enabled,r.created_at::text,b.company_name,b.slug
       FROM referrals r
       JOIN bounties b ON b.id=r.bounty_id
      ORDER BY r.created_at DESC
      LIMIT 200`,
  );
  return r.rows;
}

export async function adminListMembers() {
  const r = await query<NetworkMember>(
    `SELECT id,email,x_handle,display_name,bio,categories,channels,audience_size,country,email_alerts,status,created_at::text
       FROM network_members
      ORDER BY created_at DESC
      LIMIT 200`,
  );
  return r.rows;
}
