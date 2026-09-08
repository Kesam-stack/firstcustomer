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

export const bountySelect = `id,slug,creator_email,creator_x_handle,company_name,product_url,company_description,category,company_logo_url,headline,desired_action,referral_terms,reward_cents,goal_count,approved_count,launch_fee_cents,platform_fee_bps,payout_mode,payment_verified,is_featured,featured_until::text,network_distribution,network_matched_count,last_network_match_at::text,status,created_at::text,activated_at::text`;

const featuredLive = `(featured_until IS NOT NULL AND featured_until > NOW())`;
const fundedLiveRow = `(payment_verified AND payout_mode='stripe')`;
const liveLane = `(status='active' AND approved_count < goal_count)`;
const boardRankOrder = `CASE WHEN ${liveLane} THEN 0 ELSE 1 END, CASE WHEN ${featuredLive} THEN 0 ELSE 1 END, CASE WHEN ${fundedLiveRow} THEN 0 ELSE 1 END, CASE WHEN ${featuredLive} THEN featured_until END DESC NULLS LAST, reward_cents DESC, created_at ASC, id ASC`;

export async function getBountyBySlug(slug: string): Promise<Bounty | null> {
  const r = await query<Bounty>(`SELECT ${bountySelect} FROM bounties WHERE slug=$1 LIMIT 1`, [slug]);
  return r.rows[0] ?? null;
}

export async function getBountyById(id: string): Promise<Bounty | null> {
  const r = await query<Bounty>(`SELECT ${bountySelect} FROM bounties WHERE id=$1 LIMIT 1`, [id]);
  return r.rows[0] ?? null;
}

export async function listMarketplaceBounties(limit = 12, category?: string, sort: "recommended" | "reward" | "new" | "closing" = "recommended"): Promise<Bounty[]> {
  const fundedFirst = `(CASE WHEN ${fundedLiveRow} THEN 0 ELSE 1 END)`;
  const order = {
    recommended: boardRankOrder,
    reward: boardRankOrder,
    new: "created_at DESC",
    closing: `CASE WHEN ${liveLane} THEN 0 ELSE 1 END, ${fundedFirst},(goal_count-approved_count) ASC,reward_cents DESC`,
  }[sort];
  const values: unknown[] = [];
  let where = "status IN ('active','paused','closed')";
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
  const featuredUntil = bounty.featured_until && Date.parse(bounty.featured_until) > Date.now() ? bounty.featured_until : null;
  const r = await query<{ rank: number }>(
    `WITH me AS (
       SELECT $1::int AS reward_cents,
              $2::timestamptz AS created_at,
              $3::uuid AS id,
              ($4::timestamptz IS NOT NULL AND $4::timestamptz > NOW()) AS featured,
              $4::timestamptz AS featured_until
     )
     SELECT COUNT(*)::int + 1 AS rank
       FROM bounties b, me
      WHERE b.status='active' AND b.approved_count < b.goal_count
        AND b.payment_verified AND b.payout_mode='stripe'
        AND (
          ((b.featured_until IS NOT NULL AND b.featured_until > NOW()) AND NOT me.featured)
          OR (
            (b.featured_until IS NOT NULL AND b.featured_until > NOW()) AND me.featured
            AND (
              b.featured_until > me.featured_until
              OR (b.featured_until = me.featured_until AND b.reward_cents > me.reward_cents)
              OR (b.featured_until = me.featured_until AND b.reward_cents = me.reward_cents AND b.created_at < me.created_at)
              OR (b.featured_until = me.featured_until AND b.reward_cents = me.reward_cents AND b.created_at = me.created_at AND b.id < me.id)
            )
          )
          OR (
            NOT (b.featured_until IS NOT NULL AND b.featured_until > NOW()) AND NOT me.featured
            AND (
              b.reward_cents > me.reward_cents
              OR (b.reward_cents = me.reward_cents AND b.created_at < me.created_at)
              OR (b.reward_cents = me.reward_cents AND b.created_at = me.created_at AND b.id < me.id)
            )
          )
        )`,
    [bounty.reward_cents, bounty.created_at, bounty.id, featuredUntil],
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
    `SELECT MAX(identity_id::text)::uuid identity_id,
            (ARRAY_AGG(x_handle ORDER BY created_at DESC))[1] x_handle,
            SUM(approved_conversions)::int approved,
            SUM(paid_cents)::int paid_cents,
            SUM(earned_cents)::int earned_cents
       FROM referrals
      GROUP BY COALESCE(identity_id::text,'legacy:' || lower(x_handle))
     HAVING SUM(approved_conversions) >= $1
      ORDER BY SUM(paid_cents) DESC, SUM(approved_conversions) DESC
      LIMIT $2`,
    [config.rainmakerThreshold, limit],
  );
  return r.rows;
}

export type PublicPayout = {
  id: string;
  identity_id: string | null;
  paid_at: string;
  reward_cents: number;
  company_name: string;
  slug: string;
  headline: string;
  creator_x_handle: string | null;
  x_handle: string;
  source_post_url: string | null;
  total_approved: number;
  rainmaker: boolean;
};

export async function listPublicPayouts(limit = 12, q?: string): Promise<PublicPayout[]> {
  const values: unknown[] = [limit, config.rainmakerThreshold];
  let search = "";
  if (q) {
    values.push(`%${q}%`);
    search = ` AND (b.company_name ILIKE $3 OR b.headline ILIKE $3 OR r.x_handle ILIKE $3 OR COALESCE(b.creator_x_handle,'') ILIKE $3)`;
  }
  const r = await query<PublicPayout>(
    `SELECT c.id,
            r.identity_id,
            c.paid_at::text,
            c.reward_cents,
            b.company_name,
            b.slug,
            b.headline,
            b.creator_x_handle,
            r.x_handle,
            r.source_post_url,
            COALESCE((
              SELECT SUM(r2.approved_conversions)::int
              FROM referrals r2
              WHERE (r.identity_id IS NOT NULL AND r2.identity_id=r.identity_id)
                 OR (r.identity_id IS NULL AND r2.identity_id IS NULL AND lower(r2.x_handle)=lower(r.x_handle))
            ),0) total_approved,
            COALESCE((
              SELECT SUM(r3.approved_conversions)
              FROM referrals r3
              WHERE (r.identity_id IS NOT NULL AND r3.identity_id=r.identity_id)
                 OR (r.identity_id IS NULL AND r3.identity_id IS NULL AND lower(r3.x_handle)=lower(r.x_handle))
            ),0) >= $2 rainmaker
       FROM conversion_claims c
       JOIN bounties b ON b.id=c.bounty_id
       JOIN referrals r ON r.id=c.referral_id
      WHERE c.payout_status='paid' AND c.paid_at IS NOT NULL AND c.stripe_transfer_id IS NOT NULL${search}
      ORDER BY c.paid_at DESC
      LIMIT $1`,
    values,
  );
  return r.rows;
}


export type LeaderboardEntry = {
  identity_id: string;
  x_handle: string;
  approved: number;
  paid_customers: number;
  paid_cents: number;
  campaigns_paid: number;
  last_paid_at: string;
  rainmaker: boolean;
};

export async function listLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  const r = await query<LeaderboardEntry>(
    `WITH referral_stats AS (
       SELECT identity_id,
              (ARRAY_AGG(x_handle ORDER BY created_at DESC))[1] x_handle,
              SUM(approved_conversions)::int approved
         FROM referrals
        WHERE identity_id IS NOT NULL
        GROUP BY identity_id
     ),
     paid_stats AS (
       SELECT r.identity_id,
              COUNT(*)::int paid_customers,
              COALESCE(SUM(c.reward_cents),0)::int paid_cents,
              COUNT(DISTINCT c.bounty_id)::int campaigns_paid,
              MAX(c.paid_at)::text last_paid_at
         FROM conversion_claims c
         JOIN referrals r ON r.id=c.referral_id
        WHERE c.payout_status='paid'
          AND c.paid_at IS NOT NULL
          AND c.stripe_transfer_id IS NOT NULL
          AND r.identity_id IS NOT NULL
        GROUP BY r.identity_id
     )
     SELECT rs.identity_id,
            rs.x_handle,
            rs.approved,
            ps.paid_customers,
            ps.paid_cents,
            ps.campaigns_paid,
            ps.last_paid_at,
            rs.approved >= $2 rainmaker
       FROM referral_stats rs
       JOIN paid_stats ps ON ps.identity_id=rs.identity_id
      ORDER BY ps.paid_cents DESC, ps.paid_customers DESC, rs.approved DESC, ps.last_paid_at ASC
      LIMIT $1`,
    [limit, config.rainmakerThreshold],
  );
  return r.rows;
}

export type PublicReferrerProfile = {
  identity_id: string;
  x_handle: string;
  approved: number;
  clicks: number;
  earned_cents: number;
  paid_cents: number;
  paid_customers: number;
  campaigns_paid: number;
  first_seen_at: string;
  last_paid_at: string | null;
  rainmaker: boolean;
};

export async function getPublicReferrerProfile(identityId: string): Promise<PublicReferrerProfile | null> {
  const r = await query<PublicReferrerProfile>(
    `WITH referral_stats AS (
       SELECT identity_id,
              (ARRAY_AGG(x_handle ORDER BY created_at DESC))[1] x_handle,
              SUM(approved_conversions)::int approved,
              SUM(clicks)::int clicks,
              SUM(earned_cents)::int earned_cents,
              SUM(paid_cents)::int paid_cents,
              MIN(created_at)::text first_seen_at
         FROM referrals
        WHERE identity_id=$1::uuid
        GROUP BY identity_id
     ),
     paid_stats AS (
       SELECT r.identity_id,
              COUNT(*)::int paid_customers,
              COUNT(DISTINCT c.bounty_id)::int campaigns_paid,
              MAX(c.paid_at)::text last_paid_at
         FROM conversion_claims c
         JOIN referrals r ON r.id=c.referral_id
        WHERE r.identity_id=$1::uuid
          AND c.payout_status='paid'
          AND c.paid_at IS NOT NULL
          AND c.stripe_transfer_id IS NOT NULL
        GROUP BY r.identity_id
     )
     SELECT rs.identity_id,
            rs.x_handle,
            rs.approved,
            rs.clicks,
            rs.earned_cents,
            rs.paid_cents,
            COALESCE(ps.paid_customers,0)::int paid_customers,
            COALESCE(ps.campaigns_paid,0)::int campaigns_paid,
            rs.first_seen_at,
            ps.last_paid_at,
            rs.approved >= $2 rainmaker
       FROM referral_stats rs
       LEFT JOIN paid_stats ps ON ps.identity_id=rs.identity_id
      LIMIT 1`,
    [identityId, config.rainmakerThreshold],
  );
  return r.rows[0] ?? null;
}

export async function listPublicPayoutsByIdentity(identityId: string, limit = 20): Promise<PublicPayout[]> {
  const r = await query<PublicPayout>(
    `SELECT c.id,
            r.identity_id,
            c.paid_at::text,
            c.reward_cents,
            b.company_name,
            b.slug,
            b.headline,
            b.creator_x_handle,
            r.x_handle,
            r.source_post_url,
            COALESCE((SELECT SUM(r2.approved_conversions)::int FROM referrals r2 WHERE r2.identity_id=r.identity_id),0) total_approved,
            COALESCE((SELECT SUM(r3.approved_conversions) FROM referrals r3 WHERE r3.identity_id=r.identity_id),0) >= $3 rainmaker
       FROM conversion_claims c
       JOIN bounties b ON b.id=c.bounty_id
       JOIN referrals r ON r.id=c.referral_id
      WHERE c.payout_status='paid'
        AND c.paid_at IS NOT NULL
        AND c.stripe_transfer_id IS NOT NULL
        AND r.identity_id=$1::uuid
      ORDER BY c.paid_at DESC
      LIMIT $2`,
    [identityId, limit, config.rainmakerThreshold],
  );
  return r.rows;
}

export type PayoutReceipt = PublicPayout & {
  product_url: string;
  total_paid_cents: number;
};

export async function getPayoutReceipt(id: string): Promise<PayoutReceipt | null> {
  const r = await query<PayoutReceipt>(
    `SELECT c.id,
            r.identity_id,
            c.paid_at::text,
            c.reward_cents,
            b.company_name,
            b.slug,
            b.headline,
            b.product_url,
            b.creator_x_handle,
            r.x_handle,
            r.source_post_url,
            COALESCE((
              SELECT SUM(r2.approved_conversions)::int
                FROM referrals r2
               WHERE (r.identity_id IS NOT NULL AND r2.identity_id=r.identity_id)
                  OR (r.identity_id IS NULL AND r2.identity_id IS NULL AND lower(r2.x_handle)=lower(r.x_handle))
            ),0) total_approved,
            COALESCE((
              SELECT SUM(r3.paid_cents)::int
                FROM referrals r3
               WHERE (r.identity_id IS NOT NULL AND r3.identity_id=r.identity_id)
                  OR (r.identity_id IS NULL AND r3.identity_id IS NULL AND lower(r3.x_handle)=lower(r.x_handle))
            ),0) total_paid_cents,
            COALESCE((
              SELECT SUM(r4.approved_conversions)
                FROM referrals r4
               WHERE (r.identity_id IS NOT NULL AND r4.identity_id=r.identity_id)
                  OR (r.identity_id IS NULL AND r4.identity_id IS NULL AND lower(r4.x_handle)=lower(r.x_handle))
            ),0) >= $2 rainmaker
       FROM conversion_claims c
       JOIN bounties b ON b.id=c.bounty_id
       JOIN referrals r ON r.id=c.referral_id
      WHERE c.id=$1::uuid
        AND c.payout_status='paid'
        AND c.paid_at IS NOT NULL
        AND c.stripe_transfer_id IS NOT NULL
      LIMIT 1`,
    [id, config.rainmakerThreshold],
  );
  return r.rows[0] ?? null;
}

export async function publicLedgerStats() {
  const r = await query<{ total_paid_cents: string; payout_count: number; companies_paid: number }>(
    `SELECT
      COALESCE(SUM(reward_cents),0)::text total_paid_cents,
      COUNT(*)::int payout_count,
      COUNT(DISTINCT bounty_id)::int companies_paid
     FROM conversion_claims
     WHERE payout_status='paid' AND paid_at IS NOT NULL AND stripe_transfer_id IS NOT NULL`,
  );
  return r.rows[0] ?? { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };
}

export async function listReferrals(bountyId: string): Promise<Referral[]> {
  const r = await query<Referral>(
    `SELECT r.id,r.bounty_id,r.code,r.x_handle,r.source_post_url,r.contact_email,r.clicks,r.approved_conversions,r.earned_cents,r.paid_cents,
            COALESCE(ri.stripe_account_id,r.stripe_account_id) stripe_account_id,
            COALESCE(ri.payouts_enabled,r.payouts_enabled) payouts_enabled,
            r.created_at::text
       FROM referrals r
       LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
      WHERE r.bounty_id=$1
      ORDER BY r.approved_conversions DESC,r.clicks DESC,r.created_at ASC`,
    [bountyId],
  );
  return r.rows;
}

export async function listConversions(bountyId: string): Promise<Conversion[]> {
  const r = await query<Conversion>(`SELECT c.id,c.referral_id,c.customer_reference,c.reward_cents,c.platform_fee_cents,c.status,c.payout_status,c.fraud_status,c.fraud_score,c.fraud_reasons,c.stripe_transfer_id,c.payout_error,c.created_at::text,c.paid_at::text,c.payout_available_at::text,r.x_handle FROM conversion_claims c JOIN referrals r ON r.id=c.referral_id WHERE c.bounty_id=$1 ORDER BY c.created_at DESC`, [bountyId]);
  return r.rows;
}

export async function getReferralByCode(code: string): Promise<(Referral & { company_name: string; bounty_slug: string; headline: string; reward_cents: number; payout_mode: string; global_approved: number }) | null> {
  const r = await query<any>(`SELECT r.id,r.bounty_id,r.code,r.x_handle,r.source_post_url,r.contact_email,r.clicks,r.approved_conversions,r.earned_cents,r.paid_cents,COALESCE(ri.stripe_account_id,r.stripe_account_id) stripe_account_id,COALESCE(ri.payouts_enabled,r.payouts_enabled) payouts_enabled,r.created_at::text,b.company_name,b.slug bounty_slug,b.headline,b.reward_cents,b.payout_mode,COALESCE((SELECT SUM(r2.approved_conversions)::int FROM referrals r2 WHERE (r.identity_id IS NOT NULL AND r2.identity_id=r.identity_id) OR (r.identity_id IS NULL AND r2.identity_id IS NULL AND lower(r2.x_handle)=lower(r.x_handle))),0) global_approved FROM referrals r LEFT JOIN referrer_identities ri ON ri.id=r.identity_id JOIN bounties b ON b.id=r.bounty_id WHERE r.code=$1 LIMIT 1`, [code]);
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
            c.fraud_status,c.fraud_score,c.fraud_reasons,c.stripe_transfer_id,c.payout_error,c.created_at::text,c.paid_at::text,c.payout_available_at::text,r.x_handle,
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
    `SELECT r.id,r.bounty_id,r.code,r.x_handle,r.source_post_url,r.contact_email,r.clicks,r.approved_conversions,r.earned_cents,r.paid_cents,
            COALESCE(ri.stripe_account_id,r.stripe_account_id) stripe_account_id,
            COALESCE(ri.payouts_enabled,r.payouts_enabled) payouts_enabled,
            r.created_at::text,b.company_name,b.slug
       FROM referrals r
       LEFT JOIN referrer_identities ri ON ri.id=r.identity_id
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
