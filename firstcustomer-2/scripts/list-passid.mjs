import pg from "pg";
import crypto from "node:crypto";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 1,
});

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

const listing = {
  slug: "passid",
  companyName: "PassID",
  productUrl: "https://passid.io",
  creatorEmail: "hello@passid.io",
  creatorXHandle: "PassID_",
  companyDescription: "The financial credential layer for the global economy. Turn consented financial history into signed, reusable credentials institutions can verify without raw bank data.",
  category: "Fintech",
  companyLogoUrl: "https://passid.io/assets/icon.png",
  headline: "Bring PassID a new institution to pilot",
  desiredAction: "A new bank, fintech, lender, insurer, landlord, or platform books a sandbox verification or creates an institution workspace, using a work email, and was not already a PassID customer.",
  referralTerms: "New institutions only. No self-referrals. PassID verifies the introduction within 7 days. The reward pays when the institution starts a workspace or completes a sandbox verification.",
  rewardCents: 5000,
  goalCount: 10,
};

try {
  await pool.query("ALTER TABLE bounties ADD COLUMN IF NOT EXISTS creator_x_handle TEXT");
  await pool.query("ALTER TABLE referrals ADD COLUMN IF NOT EXISTS source_post_url TEXT");
  const existing = await pool.query("SELECT id, slug FROM bounties WHERE slug=$1 OR product_url=$2 LIMIT 1", [listing.slug, listing.productUrl]);
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE bounties SET
        company_name=$2, product_url=$3, creator_email=$4, creator_x_handle=$5, company_description=$6,
        category=$7, company_logo_url=$8, headline=$9, desired_action=$10, referral_terms=$11,
        reward_cents=$12, goal_count=$13, payout_mode='stripe', launch_fee_cents=0, payment_verified=TRUE,
        status='active', activated_at=COALESCE(activated_at, NOW()), is_featured=TRUE, network_distribution=TRUE
       WHERE id=$1`,
      [existing.rows[0].id, listing.companyName, listing.productUrl, listing.creatorEmail, listing.creatorXHandle, listing.companyDescription, listing.category, listing.companyLogoUrl, listing.headline, listing.desiredAction, listing.referralTerms, listing.rewardCents, listing.goalCount],
    );
    console.log(`Updated live listing: /b/${existing.rows[0].slug}`);
    console.log(`id=${existing.rows[0].id}`);
  } else {
    const ownerKey = randomToken(24);
    const integrationKey = `fc_live_${randomToken(24)}`;
    const inserted = await pool.query(
      `INSERT INTO bounties(
        slug,owner_secret_hash,integration_secret_hash,integration_secret_prefix,creator_email,creator_x_handle,
        company_name,product_url,company_description,category,company_logo_url,headline,desired_action,referral_terms,
        reward_cents,goal_count,payout_mode,launch_fee_cents,platform_fee_bps,network_distribution,
        payment_verified,status,activated_at,is_featured)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'stripe',0,1000,TRUE,TRUE,'active',NOW(),TRUE)
       RETURNING id, slug`,
      [listing.slug, hashToken(ownerKey), hashToken(integrationKey), integrationKey.slice(0, 12), listing.creatorEmail, listing.creatorXHandle, listing.companyName, listing.productUrl, listing.companyDescription, listing.category, listing.companyLogoUrl, listing.headline, listing.desiredAction, listing.referralTerms, listing.rewardCents, listing.goalCount],
    );
    const row = inserted.rows[0];
    console.log(`Created live listing: /b/${row.slug}`);
    console.log(`id=${row.id}`);
    console.log(`manage=/manage/${row.id}?key=${ownerKey}`);
  }
} finally {
  await pool.end();
}
