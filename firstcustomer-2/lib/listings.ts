import { query } from "@/lib/db";
import { randomToken, hashToken } from "@/lib/security";
import { slugify } from "@/lib/slug";
import { cleanHandle } from "@/lib/format";
import { requireEmail, requireHttpUrl, requireInt, requireString } from "@/lib/validation";
import { config } from "@/lib/config";

export type ComplimentaryInput = {
  companyName: string;
  productUrl: string;
  creatorEmail: string;
  creatorXHandle: string;
  companyDescription: string;
  category: string;
  headline: string;
  desiredAction: string;
  referralTerms: string;
  rewardDollars: number;
  goalCount: number;
  companyLogoUrl?: string;
  slug?: string;
  payoutMode?: "manual" | "stripe";
  expiresInHours?: number | null;
};

export async function publishComplimentaryListing(input: ComplimentaryInput) {
  const companyName = requireString(input.companyName, "Company", 80);
  const productUrl = requireHttpUrl(input.productUrl);
  const creatorEmail = requireEmail(input.creatorEmail);
  const creatorXHandle = cleanHandle(input.creatorXHandle);
  if (!creatorXHandle) throw new Error("Enter an X handle");
  const companyDescription = requireString(input.companyDescription, "Company description", 280);
  const category = requireString(input.category, "Category", 60);
  const headline = requireString(input.headline, "Headline", 140);
  const desiredAction = requireString(input.desiredAction, "Conversion criteria", 400);
  const referralTerms = requireString(input.referralTerms, "Reward terms", 600);
  const rewardDollars = requireInt(input.rewardDollars, "Reward", Math.ceil(config.minimumRewardCents / 100), Math.floor(config.maximumRewardCents / 100));
  const goalCount = requireInt(input.goalCount, "Goal", 1, config.maximumGoalCount);
  const logo = input.companyLogoUrl ? requireHttpUrl(input.companyLogoUrl) : null;
  const payoutMode = input.payoutMode === "manual" ? "manual" : "stripe";
  const expiresInHours = input.expiresInHours == null ? null : requireInt(input.expiresInHours, "Flash duration (hours)", 1, 2160);
  const slug = input.slug || slugify(companyName);
  const ownerKey = randomToken(24);
  const integrationKey = `fc_live_${randomToken(24)}`;

  const existing = await query<{ id: string }>("SELECT id FROM bounties WHERE slug=$1 LIMIT 1", [slug]);
  if (existing.rows[0]) {
    await query(
      `UPDATE bounties SET
        company_name=$2, product_url=$3, creator_email=$4, creator_x_handle=$5, company_description=$6,
        category=$7, company_logo_url=$8, headline=$9, desired_action=$10, referral_terms=$11,
        reward_cents=$12, goal_count=$13, payout_mode=$14, launch_fee_cents=0, payment_verified=TRUE,
        status='active', activated_at=COALESCE(activated_at, NOW()), is_featured=TRUE,
        expires_at=CASE WHEN $15::int IS NULL THEN expires_at ELSE NOW() + ($15::int * INTERVAL '1 hour') END
       WHERE slug=$1`,
      [slug, companyName, productUrl, creatorEmail, creatorXHandle, companyDescription, category, logo, headline, desiredAction, referralTerms, rewardDollars * 100, goalCount, payoutMode, expiresInHours],
    );
    return { id: existing.rows[0].id, slug, ownerKey: null as string | null, integrationKey: null as string | null, created: false };
  }

  const inserted = await query<{ id: string }>(
    `INSERT INTO bounties(
        slug,owner_secret_hash,integration_secret_hash,integration_secret_prefix,creator_email,creator_x_handle,
        company_name,product_url,company_description,category,company_logo_url,headline,desired_action,referral_terms,
        reward_cents,goal_count,payout_mode,launch_fee_cents,platform_fee_bps,network_distribution,
        payment_verified,status,activated_at,is_featured,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,0,$18,TRUE,TRUE,'active',NOW(),TRUE,
            CASE WHEN $19::int IS NULL THEN NULL ELSE NOW() + ($19::int * INTERVAL '1 hour') END)
     RETURNING id`,
    [slug, hashToken(ownerKey), hashToken(integrationKey), integrationKey.slice(0, 12), creatorEmail, creatorXHandle, companyName, productUrl, companyDescription, category, logo, headline, desiredAction, referralTerms, rewardDollars * 100, goalCount, payoutMode, config.platformFeeBps, expiresInHours],
  );
  return { id: inserted.rows[0].id, slug, ownerKey, integrationKey, created: true };
}
