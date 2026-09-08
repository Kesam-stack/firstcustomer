CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  owner_secret_hash TEXT NOT NULL,
  integration_secret_hash TEXT,
  integration_secret_prefix TEXT,
  creator_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  company_description TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  company_logo_url TEXT,
  headline TEXT NOT NULL,
  desired_action TEXT NOT NULL,
  referral_terms TEXT,
  reward_cents INTEGER NOT NULL CHECK (reward_cents >= 100),
  goal_count INTEGER NOT NULL CHECK (goal_count > 0 AND goal_count <= 10000),
  approved_count INTEGER NOT NULL DEFAULT 0 CHECK (approved_count >= 0),
  launch_fee_cents INTEGER NOT NULL DEFAULT 900 CHECK (launch_fee_cents >= 0),
  platform_fee_bps INTEGER NOT NULL DEFAULT 1000 CHECK (platform_fee_bps >= 0 AND platform_fee_bps <= 5000),
  payout_mode TEXT NOT NULL DEFAULT 'manual' CHECK (payout_mode IN ('manual', 'stripe')),
  payment_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

ALTER TABLE bounties ADD COLUMN IF NOT EXISTS integration_secret_hash TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS integration_secret_prefix TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS referral_terms TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS platform_fee_bps INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS payout_mode TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS creator_x_handle TEXT;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS stripe_checkout_events (
  session_id TEXT PRIMARY KEY,
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stripe_checkout_events_bounty ON stripe_checkout_events(bounty_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bounties_featured_until ON bounties(featured_until DESC) WHERE featured_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bounties_slug ON bounties(slug);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_marketplace ON bounties(status, is_featured DESC, payment_verified DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  manage_secret_hash TEXT,
  x_handle TEXT NOT NULL,
  contact_email TEXT,
  stripe_account_id TEXT,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  approved_conversions INTEGER NOT NULL DEFAULT 0 CHECK (approved_conversions >= 0),
  earned_cents INTEGER NOT NULL DEFAULT 0 CHECK (earned_cents >= 0),
  paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS manage_secret_hash TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS earned_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS paid_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS source_post_url TEXT;

CREATE INDEX IF NOT EXISTS idx_referrals_bounty ON referrals(bounty_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_handle ON referrals(bounty_id, lower(x_handle));

CREATE TABLE IF NOT EXISTS conversion_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  customer_reference TEXT NOT NULL,
  external_event_id TEXT,
  note TEXT,
  reward_cents INTEGER NOT NULL DEFAULT 0 CHECK (reward_cents >= 0),
  platform_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  payout_status TEXT NOT NULL DEFAULT 'manual_due' CHECK (payout_status IN ('manual_due', 'payment_pending', 'processing', 'paid', 'failed', 'not_configured')),
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  payout_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS external_event_id TEXT;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS reward_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'manual_due';
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS payout_error TEXT;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS payout_available_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_conversion_payout_due ON conversion_claims(payout_available_at) WHERE payout_status = 'payment_pending';

CREATE INDEX IF NOT EXISTS idx_conversion_claims_bounty ON conversion_claims(bounty_id);
CREATE INDEX IF NOT EXISTS idx_conversion_claims_referral ON conversion_claims(referral_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_unique_customer ON conversion_claims(bounty_id, customer_reference);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_unique_external_event ON conversion_claims(bounty_id, external_event_id) WHERE external_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_clicks (
  id BIGSERIAL PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referral ON referral_clicks(referral_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id UUID NOT NULL REFERENCES conversion_claims(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_events_conversion ON payout_events(conversion_id, created_at DESC);


-- FirstCustomer Network: campaigns are distributed inside the platform even when a company never posts externally.
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS network_distribution BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS network_matched_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bounties ADD COLUMN IF NOT EXISTS last_network_match_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS network_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manage_secret_hash TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  x_handle TEXT,
  display_name TEXT NOT NULL,
  bio TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  channels TEXT[] NOT NULL DEFAULT '{}',
  audience_size INTEGER NOT NULL DEFAULT 0 CHECK (audience_size >= 0),
  country TEXT,
  email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_network_members_status ON network_members(status,created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES network_members(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','claimed','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  UNIQUE(bounty_id,member_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_matches_member ON campaign_matches(member_id,status,score DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_matches_bounty ON campaign_matches(bounty_id,status,score DESC);


-- Canonical referrer identity and payout-risk controls.
CREATE TABLE IF NOT EXISTS referrer_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT UNIQUE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  risk_status TEXT NOT NULL DEFAULT 'clear' CHECK (risk_status IN ('clear','review','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS identity_id UUID REFERENCES referrer_identities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_identity ON referrals(identity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_identity_per_bounty
  ON referrals(bounty_id, identity_id)
  WHERE identity_id IS NOT NULL;

ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS company_identity_hash TEXT;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS customer_fingerprint TEXT;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS fraud_status TEXT NOT NULL DEFAULT 'clear';
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS fraud_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS fraud_reasons TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE conversion_claims ADD COLUMN IF NOT EXISTS attribution_locked_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversion_claims_fraud_status_check'
  ) THEN
    ALTER TABLE conversion_claims
      ADD CONSTRAINT conversion_claims_fraud_status_check
      CHECK (fraud_status IN ('clear','review','blocked'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversion_claims_fraud_score_check'
  ) THEN
    ALTER TABLE conversion_claims
      ADD CONSTRAINT conversion_claims_fraud_score_check
      CHECK (fraud_score >= 0 AND fraud_score <= 100);
  END IF;
END $$;

-- A customer can have only one active attribution for the same company identity.
-- Rejected claims are excluded so a later valid referral can still be attributed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_unique_company_customer
  ON conversion_claims(company_identity_hash, customer_fingerprint)
  WHERE company_identity_hash IS NOT NULL
    AND customer_fingerprint IS NOT NULL
    AND status IN ('pending','approved');

-- Stripe money movement objects are one-to-one with a conversion.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_unique_payment_intent
  ON conversion_claims(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_unique_transfer
  ON conversion_claims(stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_fraud_review
  ON conversion_claims(fraud_status, created_at DESC)
  WHERE fraud_status <> 'clear';


-- Privacy-preserving first-party product analytics.
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  referrer_host TEXT,
  referrer_path TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created
  ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path_created
  ON analytics_events(path,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_created
  ON analytics_events(visitor_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created
  ON analytics_events(session_hash,created_at DESC);
