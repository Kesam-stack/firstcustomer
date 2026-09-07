import Link from "next/link";
import type { Bounty } from "@/lib/types";
import { money } from "@/lib/format";

export default function BountyCard({ bounty }: { bounty: Bounty }) {
  const left = Math.max(0, bounty.goal_count - bounty.approved_count);
  const initial = bounty.company_name.trim().charAt(0).toUpperCase();

  return <Link href={`/b/${bounty.slug}`} className="market-row">
    <div className="market-company">
      <div className="company-mark">{bounty.company_logo_url ? <img src={bounty.company_logo_url} alt="" /> : initial}</div>
      <div><strong>{bounty.company_name}</strong><span>{bounty.category}</span></div>
    </div>
    <div className="market-mission"><strong>{bounty.headline}</strong><span>{bounty.desired_action}</span></div>
    <div className="market-number"><span>Reward</span><strong>{money(bounty.reward_cents)}</strong></div>
    <div className="market-number"><span>Remaining</span><strong>{left}</strong></div>
    <div className="market-status">{bounty.payment_verified ? <span className="status-verified">Verified</span> : <span>Pending</span>}<small>{bounty.payout_mode === "stripe" ? "Auto payout" : "Manual payout"}</small></div>
    <div className="market-arrow">↗</div>
  </Link>;
}
