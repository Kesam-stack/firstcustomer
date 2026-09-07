import Link from "next/link";
import type { Bounty } from "@/lib/types";
import { money, poolCents, remaining } from "@/lib/format";
import { isFunded } from "@/lib/market";

export default function BountyCard({ bounty, rank }: { bounty: Bounty; rank?: number }) {
  const left = remaining(bounty.goal_count, bounty.approved_count);
  const pool = poolCents(bounty.reward_cents, bounty.goal_count, bounty.approved_count);
  const initial = bounty.company_name.trim().charAt(0).toUpperCase();
  const clicks = bounty.click_count ?? 0;
  const funded = isFunded(bounty);

  return <Link href={`/b/${bounty.slug}`} className="board-row">
    <div className={`board-rank${rank === 1 ? " top" : ""}`}>{rank ? String(rank).padStart(2, "0") : "—"}</div>
    <div className="market-company">
      <div className="company-mark">{bounty.company_logo_url ? <img src={bounty.company_logo_url} alt="" /> : initial}</div>
      <div><strong>{bounty.company_name}</strong><span>{bounty.category}</span></div>
    </div>
    <div className="market-mission"><strong>{bounty.headline}</strong><span>{bounty.desired_action}</span></div>
    <div className="market-number reward"><span>Reward</span><strong>{money(bounty.reward_cents)}</strong></div>
    <div className="market-number"><span>Pool</span><strong>{money(pool)}</strong></div>
    <div className="market-number"><span>Left</span><strong>{left}</strong></div>
    <div className="market-number"><span>Clicks</span><strong>{clicks}</strong></div>
    <div className="market-status">{funded ? <span className="status-verified">{bounty.launch_fee_cents === 0 ? "Live" : "Funded"}</span> : bounty.payment_verified ? <span>Manual</span> : <span>Pending</span>}<small>{funded ? (bounty.launch_fee_cents === 0 ? "Fee waived" : "Auto payout") : "Cannot take #1"}</small></div>
  </Link>;
}
