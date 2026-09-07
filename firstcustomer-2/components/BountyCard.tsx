import Link from "next/link";
import type { Bounty } from "@/lib/types";
import { money } from "@/lib/format";

export default function BountyCard({ bounty }: { bounty: Bounty }) {
  const left = Math.max(0, bounty.goal_count - bounty.approved_count);
  const initial = bounty.company_name.trim().charAt(0).toUpperCase();
  return <Link href={`/b/${bounty.slug}`} className="campaign-card">
    <div className="campaign-company"><div className="company-mark">{bounty.company_logo_url ? <img src={bounty.company_logo_url} alt="" /> : initial}</div><div><strong>{bounty.company_name}</strong><span>{bounty.category}</span></div>{bounty.payment_verified && <span className="verified-badge">Payment verified</span>}</div>
    <h3>{bounty.headline}</h3><p>{bounty.desired_action}</p>
    <div className="campaign-metrics"><div><small>Reward</small><b>{money(bounty.reward_cents)}</b></div><div><small>Slots left</small><b>{left}</b></div><div><small>Network</small><b>{bounty.network_matched_count}</b></div></div>
    <div className="campaign-footer"><span>{bounty.payout_mode === "stripe" ? "Automatic payout eligible" : "Company-paid reward"}</span><b>View mission →</b></div>
  </Link>;
}
