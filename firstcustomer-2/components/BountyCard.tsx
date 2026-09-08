import Link from "next/link";
import type { Bounty } from "@/lib/types";
import { money, poolCents, remaining } from "@/lib/format";
import { isFunded, isHoldActive, isLive } from "@/lib/market";

export default function BountyCard({ bounty, rank }: { bounty: Bounty; rank?: number }) {
  const left = remaining(bounty.goal_count, bounty.approved_count);
  const pool = poolCents(bounty.reward_cents, bounty.goal_count, bounty.approved_count);
  const initial = bounty.company_name.trim().charAt(0).toUpperCase();
  const claims = bounty.referrer_count ?? 0;
  const clicks = bounty.click_count ?? 0;
  const funded = isFunded(bounty);
  const holding = isHoldActive(bounty);
  const live = isLive(bounty);
  const statusLabel = !live
    ? bounty.status === "paused" ? "Paused" : "Closed"
    : holding ? "Hold #1" : funded ? (bounty.launch_fee_cents === 0 ? "Live" : "Funded") : bounty.payment_verified ? "Manual" : "Pending";
  const statusNote = !live
    ? "Not ranking"
    : holding ? "Paid pin" : funded ? (bounty.launch_fee_cents === 0 ? "Fee waived" : "Auto payout") : "Cannot take #1";

  return <Link href={`/b/${bounty.slug}`} className={`board-row${live ? "" : " closed"}`}>
    <div className={`board-rank${rank === 1 ? " top" : ""}`}>{rank ? String(rank).padStart(2, "0") : "—"}</div>
    <div className="market-company">
      <div className="company-mark">{bounty.company_logo_url ? <img src={bounty.company_logo_url} alt="" /> : initial}</div>
      <div><strong>{bounty.company_name}</strong><span>{holding && live ? "Hold #1" : bounty.category}</span></div>
    </div>
    <div className="market-mission"><strong>{bounty.headline}</strong><span>{bounty.desired_action}</span></div>
    <div className="market-number reward"><span>Reward</span><strong>{money(bounty.reward_cents)}</strong></div>
    <div className="market-number"><span>Pool</span><strong>{money(pool)}</strong></div>
    <div className="market-number"><span>Left</span><strong>{left}</strong></div>
    <div className="market-number"><span>Clicks</span><strong>{clicks}</strong></div>
    <div className="market-number"><span>Claims</span><strong>{claims}</strong></div>
    <div className="market-status"><span className={live && funded ? "status-verified" : ""}>{statusLabel}</span><small>{statusNote}</small></div>
  </Link>;
}
