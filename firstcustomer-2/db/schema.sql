CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  owner_secret_hash TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  headline TEXT NOT NULL,
  desired_action TEXT NOT NULL,
  reward_cents INTEGER NOT NULL CHECK (reward_cents >= 100),
  goal_count INTEGER NOT NULL CHECK (goal_count > 0 AND goal_count <= 10000),
  approved_count INTEGER NOT NULL DEFAULT 0 CHECK (approved_count >= 0),
  launch_fee_cents INTEGER NOT NULL DEFAULT 900 CHECK (launch_fee_cents >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  stripe_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bounties_slug ON bounties(slug);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  x_handle TEXT NOT NULL,
  contact_email TEXT,
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  approved_conversions INTEGER NOT NULL DEFAULT 0 CHECK (approved_conversions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_bounty ON referrals(bounty_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);

CREATE TABLE IF NOT EXISTS conversion_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  customer_reference TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversion_claims_bounty ON conversion_claims(bounty_id);
CREATE INDEX IF NOT EXISTS idx_conversion_claims_referral ON conversion_claims(referral_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_unique_customer ON conversion_claims(bounty_id, customer_reference);
