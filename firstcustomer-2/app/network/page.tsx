import Link from "next/link";
import JoinNetworkForm from "@/components/JoinNetworkForm";
import BountyCard from "@/components/BountyCard";
import { listMarketplaceBounties, marketplaceStats } from "@/lib/db";
import { money } from "@/lib/format";
import { rankFunded } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  let stats = { campaigns: 0, open_reward_cents: "0", network_members: 0, highest_reward_cents: "0", click_count: 0 };
  let campaigns = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  try { [stats, campaigns] = await Promise.all([marketplaceStats(), listMarketplaceBounties(6, "All", "reward")]); } catch {}

  return <main className="shell page">
    <div className="network-title">
      <div>
        <span className="eyebrow">Earn</span>
        <h1>The other side of the board.</h1>
        <p>Companies price a customer. You claim a tracked link, send the right people, and get paid when it closes.</p>
      </div>
      <div className="network-numbers">
        <div><span>Funded pool</span><strong>{money(Number(stats.open_reward_cents))}</strong></div>
        <div><span>Live</span><strong>{stats.campaigns}</strong></div>
        <div><span>Members</span><strong>{stats.network_members}</strong></div>
      </div>
    </div>

    <section className="network-layout">
      <div>
        <div className="section-bar"><div><span>01</span><h2>Current board</h2></div><Link href="/explore">Full market</Link></div>
        <div className="board-head compact">
          <span>#</span><span>Company</span><span>Customer</span><span>Reward</span><span>Pool</span><span>Left</span><span>Claims</span><span>Status</span>
        </div>
        <div className="board-list">
          {campaigns.length
            ? rankFunded(campaigns).map(({ row, rank }) => <BountyCard bounty={row} rank={rank} key={row.id} />)
            : <div className="board-empty"><span>Waiting on demand</span><strong>No live campaigns yet.</strong><p>Join now. Your feed activates when a company lists.</p></div>}
        </div>
      </div>
      <div className="network-signup">
        <div className="network-signup-copy">
          <span>02</span>
          <h2>Get deal flow.</h2>
          <p>Tell us the markets you understand and the channels you actually use. Audience size is optional. Direct introductions count.</p>
        </div>
        <JoinNetworkForm />
      </div>
    </section>
  </main>;
}
