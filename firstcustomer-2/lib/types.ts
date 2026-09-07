export type BountyStatus = "draft" | "active" | "paused" | "closed";

export type Bounty = {
  id: string;
  slug: string;
  creator_email: string;
  company_name: string;
  product_url: string;
  headline: string;
  desired_action: string;
  reward_cents: number;
  goal_count: number;
  approved_count: number;
  launch_fee_cents: number;
  status: BountyStatus;
  created_at: string;
  activated_at: string | null;
};

export type Referral = {
  id: string;
  bounty_id: string;
  code: string;
  x_handle: string;
  contact_email: string | null;
  clicks: number;
  approved_conversions: number;
  created_at: string;
};
