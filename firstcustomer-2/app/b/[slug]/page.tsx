import { notFound } from "next/navigation";
import { getBountyBySlug } from "@/lib/db";
import { money } from "@/lib/format";
import ReferralBox from "@/components/ReferralBox";

export const dynamic = "force-dynamic";

export default async function BountyPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ ref?: string }> }) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const bounty = await getBountyBySlug(slug);
  if (!bounty || bounty.status === "draft") notFound();
  const pct = Math.min(100, Math.round((bounty.approved_count / bounty.goal_count) * 100));
  const total = bounty.reward_cents * bounty.goal_count;

  return (
    <main className="shell narrow page-pad">
      <div className="bounty-card public-card">
        <div className="demo-top"><span className={bounty.status === "active" ? "live-dot" : "muted-dot"} /> {bounty.status.toUpperCase()} BOUNTY <span className="demo-code">{bounty.company_name}</span></div>
        <h1>{bounty.headline}</h1>
        <p className="bounty-action">{bounty.desired_action}</p>
        <div className="reward-grid">
          <div><span>REWARD</span><strong>{money(bounty.reward_cents)}</strong><small>per approved customer</small></div>
          <div><span>PROGRESS</span><strong>{bounty.approved_count} / {bounty.goal_count}</strong><small>approved</small></div>
          <div><span>BOUNTY</span><strong>{money(total)}</strong><small>total opportunity</small></div>
        </div>
        <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        {ref ? <a className="button dark full" href={`/r/${encodeURIComponent(ref)}`}>Visit {bounty.company_name} →</a> : bounty.status === "active" ? <ReferralBox slug={bounty.slug} companyName={bounty.company_name} /> : <div className="notice">This bounty has reached its goal and is no longer accepting new referrers.</div>}
        <p className="fineprint center">Rewards are offered and paid by {bounty.company_name}, not FirstCustomer. Eligibility is subject to the founder&apos;s stated criteria.</p>
      </div>
    </main>
  );
}
