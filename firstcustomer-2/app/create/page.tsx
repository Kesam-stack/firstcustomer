import CreateBountyForm from "@/components/CreateBountyForm";
import { config, launchFeeDollars, platformFeePercent } from "@/lib/config";

export default async function Create({ searchParams }: { searchParams: Promise<{ url?: string; reward?: string; goal?: string; cancelled?: string }> }) {
  const params = await searchParams;
  const reward = Number(params.reward || "");
  const goal = Number(params.goal || "");

  return <main className="shell page create-page">
    <div className="create-intro">
      <span className="eyebrow">List</span>
      <h1>Put a price on a customer.</h1>
      <p>You only pay when you approve a real customer. Highest funded bounty sits at #1 — write the acceptance test first.</p>
      {params.cancelled === "1" && <div className="warning" style={{ marginTop: 18 }}>Checkout was cancelled. Nothing was charged.</div>}
      <div className="create-rail">
        <div><span>01</span><strong>Company</strong><small>What you sell</small></div>
        <div><span>02</span><strong>Outcome</strong><small>What qualifies</small></div>
        <div><span>03</span><strong>Economics</strong><small>Reward + target</small></div>
        <div><span>04</span><strong>List</strong><small>Pay $9 · take a rank</small></div>
      </div>
    </div>
    <CreateBountyForm
      launchFeeDollars={launchFeeDollars}
      platformFeePercent={platformFeePercent}
      minimumRewardDollars={config.minimumRewardCents / 100}
      maximumRewardDollars={config.maximumRewardCents / 100}
      maximumGoalCount={config.maximumGoalCount}
      maximumPoolDollars={config.maximumPoolCents / 100}
      initialProductUrl={params.url || ""}
      initialReward={Number.isFinite(reward) && reward > 0 ? reward : undefined}
      initialGoal={Number.isFinite(goal) && goal > 0 ? goal : undefined}
    />
  </main>;
}
