export type BountyStatus = "draft" | "active" | "paused" | "closed";
export type PayoutMode = "manual" | "stripe";
export type PayoutStatus = "manual_due" | "payment_pending" | "processing" | "paid" | "failed" | "not_configured";

export type Bounty = {
  id: string;
  slug: string;
  creator_email: string;
  company_name: string;
  product_url: string;
  company_description: string | null;
  category: string;
  company_logo_url: string | null;
  headline: string;
  desired_action: string;
  referral_terms: string | null;
  reward_cents: number;
  goal_count: number;
  approved_count: number;
  launch_fee_cents: number;
  platform_fee_bps: number;
  payout_mode: PayoutMode;
  payment_verified: boolean;
  is_featured: boolean;
  network_distribution: boolean;
  network_matched_count: number;
  last_network_match_at: string | null;
  status: BountyStatus;
  created_at: string;
  activated_at: string | null;
  click_count?: number;
  referrer_count?: number;
};

export type Rainmaker = {
  x_handle: string;
  approved: number;
  paid_cents: number;
  earned_cents: number;
};

export type Referral = {
  id: string;
  bounty_id: string;
  code: string;
  x_handle: string;
  contact_email: string | null;
  clicks: number;
  approved_conversions: number;
  earned_cents: number;
  paid_cents: number;
  stripe_account_id: string | null;
  payouts_enabled: boolean;
  created_at: string;
};

export type Conversion = {
  id: string;
  referral_id: string;
  customer_reference: string;
  reward_cents: number;
  platform_fee_cents: number;
  status: "pending" | "approved" | "rejected";
  payout_status: PayoutStatus;
  stripe_transfer_id: string | null;
  payout_error: string | null;
  created_at: string;
  paid_at: string | null;
  x_handle?: string;
};

export type NetworkMember = {
  id: string;
  email: string;
  x_handle: string | null;
  display_name: string;
  bio: string | null;
  categories: string[];
  channels: string[];
  audience_size: number;
  country: string | null;
  email_alerts: boolean;
  status: "active" | "paused";
  created_at: string;
};

export type CampaignMatch = Bounty & {
  match_id: string;
  match_score: number;
  match_reason: string | null;
  match_status: "offered" | "claimed" | "declined";
};
