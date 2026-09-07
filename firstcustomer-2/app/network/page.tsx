import Link from "next/link";
import JoinNetworkForm from "@/components/JoinNetworkForm";
import BountyCard from "@/components/BountyCard";
import { listMarketplaceBounties, marketplaceStats } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  let stats = { campaigns: 0, open_reward_cents: "0", network_members: 0 };
  let campaigns = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  try { [stats, campaigns] = await Promise.all([marketplaceStats(), listMarketplaceBounties(4)]); } catch {}

  return <main className="shell page">
    <div className="network-title">
      <div>
        <span className="eyebrow">Earn</span>
        <h1>Get paid for introductions that close.</h1>
        <p>Join once. FirstCustomer routes relevant campaigns into your private feed. You choose what to claim.</p>
      </div>
      <div className="network-numbers">
        <div><span>Open rewards</span><strong>{money(Number(stats.open_reward_cents))}</strong></div>
        <div><span>Live campaigns</span><strong>{stats.campaigns}</strong></div>
        <div><span>Members</span><strong>{stats.network_members}</strong></div>
      </div>
    </div>

    <section className="network-layout">
      <div>
        <div className="section-bar"><div><span>01</span><h2>Current opportunities</h2></div><Link href="/explore">Full market</Link></div>
        <div className="market-list compact">{campaigns.length ? campaigns.map((campaign) => <BountyCard bounty={campaign} key={campaign.id} />) : <div className="empty-state"><strong>No live campaigns yet.</strong><span>Join now and your feed will activate when demand enters the market.</span></div>}</div>
      </div>
      <div className="network-signup">
        <div className="network-signup-copy"><span>02</span><h2>Build your deal flow.</h2><p>Tell us the markets you understand and the channels you actually use. Audience size is optional; direct introductions count.</p></div>
        <JoinNetworkForm />
      </div>
    </section>
  </main>;
}
