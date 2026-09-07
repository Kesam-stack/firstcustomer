import { notFound } from "next/navigation";
import Link from "next/link";
import { getBountyBySlug, getBountyRank, bountyTraffic } from "@/lib/db";
import { money, poolCents, remaining, tweetIntent } from "@/lib/format";
import ReferralBox from "@/components/ReferralBox";
import { config } from "@/lib/config";
import { isFunded, isHoldActive } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const bounty = await getBountyBySlug(slug);
  if (!bounty || bounty.status === "draft") notFound();

  const [rank, traffic] = await Promise.all([getBountyRank(bounty), bountyTraffic(bounty.id)]);
  const left = remaining(bounty.goal_count, bounty.approved_count);
  const pool = poolCents(bounty.reward_cents, bounty.goal_count, bounty.approved_count);
  const pct = Math.min(100, Math.round((bounty.approved_count / bounty.goal_count) * 100));
  const host = new URL(bounty.product_url).hostname;
  const holding = isHoldActive(bounty);
  const share = tweetIntent(`${bounty.company_name} is paying ${money(bounty.reward_cents)} per verified customer on FirstCustomer. ${config.appUrl}/b/${bounty.slug}`);

  return <main className="narrow page-pad">
    <div className="listing">
      <div className="bounty-topbar">
        <span className="live-dot" />
        <b>{rank ? `#${rank} on the board` : isFunded(bounty) ? bounty.status.toUpperCase() : "Manual payout"}</b>
        <span>{bounty.category}</span>
        {holding ? <span className="verified-badge">Hold #1</span> : isFunded(bounty) ? <span className="verified-badge">{bounty.launch_fee_cents === 0 ? "Fee waived · live" : "Funded auto payout"}</span> : bounty.payment_verified ? <span className="verified-badge">Launch paid · manual</span> : null}
      </div>

      <div className="campaign-company">
        <div className="company-mark">{bounty.company_logo_url ? <img src={bounty.company_logo_url} alt="" /> : bounty.company_name[0]}</div>
        <div><strong>{bounty.company_name}</strong><span>{host}</span></div>
      </div>

      <h1>{bounty.headline}</h1>
      <p className="bounty-action">{bounty.desired_action}</p>

      <div className="listing-money">
        <div><span>Per customer</span><strong>{money(bounty.reward_cents)}</strong></div>
        <div><span>Still on the table</span><strong>{money(pool)}</strong></div>
        <div><span>Remaining</span><strong>{left}</strong></div>
        <div><span>Clicks</span><strong>{traffic.click_count}</strong></div>
      </div>
      <div className="progress"><div style={{ width: `${pct}%` }} /></div>
      <p className="listing-meta">{traffic.referrer_count} referrer{traffic.referrer_count === 1 ? "" : "s"} · {holding ? "Holding #1" : isFunded(bounty) ? "Funded automatic payout" : "Manual payout — cannot take #1"} · {bounty.approved_count}/{bounty.goal_count} approved</p>

      <div className="summary-box">
        <span>Company</span>
        <p>{bounty.company_description}</p>
        <span>What qualifies</span>
        <p>{bounty.desired_action}</p>
        <span>Reward terms</span>
        <p>{bounty.referral_terms}</p>
      </div>

      {ref
        ? <a className="button dark full" href={`/r/${encodeURIComponent(ref)}`}>Continue to {bounty.company_name} →</a>
        : bounty.status === "active"
          ? <ReferralBox slug={bounty.slug} companyName={bounty.company_name} payoutMode={bounty.payout_mode} />
          : <div className="notice">This campaign is no longer accepting referrals.</div>}

      <div className="two-actions listing-share">
        <a className="button secondary" href={share} target="_blank" rel="noreferrer">Share this bounty on X</a>
        <Link className="button secondary" href="/">Back to the board</Link>
      </div>
      <p className="fineprint center">FirstCustomer tracks attribution and payout state. Eligibility remains subject to the published campaign criteria.</p>
    </div>
  </main>;
}
