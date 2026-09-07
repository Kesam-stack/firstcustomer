import { Pool } from "pg";
import crypto from "node:crypto";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Refusing to seed production. Set ALLOW_DEMO_SEED=true if you really mean it.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL first");
const pool = new Pool({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
const key = "demo-owner-key";
const hash = crypto.createHash("sha256").update(key).digest("hex");
const result = await pool.query(
  `INSERT INTO bounties (slug, owner_secret_hash, creator_email, company_name, product_url, headline, desired_action, reward_cents, goal_count, approved_count, status, activated_at)
   VALUES ('acme-demo', $1, 'founder@example.com', 'Acme', 'https://example.com', 'Help Acme get its first 10 paying teams.', 'A new company starts a paid Pro plan and remains active for 7 days.', 5000, 10, 3, 'active', NOW())
   ON CONFLICT (slug) DO UPDATE SET headline=EXCLUDED.headline
   RETURNING id`, [hash]
);
console.log(`Demo bounty: http://localhost:3000/b/acme-demo`);
console.log(`Founder dashboard: http://localhost:3000/manage/${result.rows[0].id}?key=${key}`);
await pool.end();
