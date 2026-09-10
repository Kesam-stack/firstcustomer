import type { Bounty } from "@/lib/types";

export function isFunded(bounty: Pick<Bounty, "payment_verified" | "payout_mode">) {
  return bounty.payment_verified && bounty.payout_mode === "stripe";
}

export function isHoldActive(bounty: Pick<Bounty, "featured_until">) {
  if (!bounty.featured_until) return false;
  const until = Date.parse(bounty.featured_until);
  return Number.isFinite(until) && until > Date.now();
}

export function isExpired(bounty: Pick<Bounty, "expires_at">) {
  if (!bounty.expires_at) return false;
  const at = Date.parse(bounty.expires_at);
  return Number.isFinite(at) && at <= Date.now();
}

// A flash bounty is any bounty with a future auto-expiry time box.
export function isFlash(bounty: Pick<Bounty, "expires_at">) {
  if (!bounty.expires_at) return false;
  const at = Date.parse(bounty.expires_at);
  return Number.isFinite(at) && at > Date.now();
}

export function isLive(bounty: Pick<Bounty, "status" | "approved_count" | "goal_count" | "expires_at">) {
  return bounty.status === "active" && bounty.approved_count < bounty.goal_count && !isExpired(bounty);
}

export function rankFunded<T extends Pick<Bounty, "payment_verified" | "payout_mode" | "status" | "approved_count" | "goal_count" | "expires_at">>(rows: T[]) {
  let rank = 0;
  return rows.map((row) => ({ row, rank: isLive(row) && isFunded(row) ? ++rank : undefined }));
}
