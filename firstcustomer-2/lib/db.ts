import { Pool, type QueryResultRow } from "pg";
import type { Bounty, Referral } from "@/lib/types";

const globalForDb = globalThis as unknown as { pool?: Pool };

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }

  return globalForDb.pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await getPool().query<T>(text, values);
  return result;
}

export async function getBountyBySlug(slug: string): Promise<Bounty | null> {
  const result = await query<Bounty>(
    `SELECT id, slug, creator_email, company_name, product_url, headline, desired_action,
            reward_cents, goal_count, approved_count, launch_fee_cents, status,
            created_at::text, activated_at::text
       FROM bounties WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function getBountyById(id: string): Promise<Bounty | null> {
  const result = await query<Bounty>(
    `SELECT id, slug, creator_email, company_name, product_url, headline, desired_action,
            reward_cents, goal_count, approved_count, launch_fee_cents, status,
            created_at::text, activated_at::text
       FROM bounties WHERE id = $1 LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listReferrals(bountyId: string): Promise<Referral[]> {
  const result = await query<Referral>(
    `SELECT id, bounty_id, code, x_handle, contact_email, clicks, approved_conversions, created_at::text
       FROM referrals WHERE bounty_id = $1
       ORDER BY approved_conversions DESC, clicks DESC, created_at ASC`,
    [bountyId],
  );
  return result.rows;
}
