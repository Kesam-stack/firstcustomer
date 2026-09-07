import type { Bounty } from "@/lib/types";

export function isFunded(bounty: Pick<Bounty, "payment_verified" | "payout_mode">) {
  return bounty.payment_verified && bounty.payout_mode === "stripe";
}

export function rankFunded<T extends Pick<Bounty, "payment_verified" | "payout_mode">>(rows: T[]) {
  let rank = 0;
  return rows.map((row) => ({ row, rank: isFunded(row) ? ++rank : undefined }));
}
