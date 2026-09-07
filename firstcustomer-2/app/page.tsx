import Link from "next/link";
import { listMarketplaceBounties, marketplaceStats, listPublicPayouts, publicLedgerStats, listRainmakers } from "@/lib/db";
import BountyCard from "@/components/BountyCard";
import QuickLaunch from "@/components/QuickLaunch";
import { money } from "@/lib/format";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

const emptyStats = { campaigns: 0, open_reward_cents: "0", network_members: 0, highest_reward_cents: "0", click_count: 0 };
const emptyLedger = { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };

export default async function Home() {
  let bounties = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  let payouts = [] as Awaited<ReturnType<typeof listPublicPayouts>>;
  let rainmakers = [] as Awaited<ReturnType<typeof listRainmakers>>;
  let stats = emptyStats;
  let ledger = emptyLedger;

  try {
    [bounties, payouts, rainmakers, stats, ledger] = await Promise.all([
      listMarketplaceBounties(12, "All", "reward"),
      listPublicPayouts(6),
      listRainmakers(6),
      marketplaceStats(),
      publicLedgerStats(),
    ]);
  } catch {}

  const takeFirst = Number(stats.highest_reward_cents) > 0
    ? money(Number(stats.highest_reward_cents))
    : "yours";

  return <main>
    <section className="board-top shell">
      <p className="board-kicker">Highest bounty sits at #1</p>
      <h1>Pay for customers.<br />Not clicks.</h1>
      <p className="board-sub">Companies price a customer. People deliver it.</p>
      <QuickLaunch minimumRewardDollars={config.minimumRewardCents / 100} />
    </section>

    <section className="board-meta">
      <div className="shell ticker-inner">
        <div><span>Open pool</span><strong>{money(Number(stats.open_reward_cents))}</strong></div>
        <div><span>Live listings</span><strong>{stats.campaigns}</strong></div>
        <div><span>Take #1</span><strong>{takeFirst}</strong></div>
        <div><span>Paid through ledger</span><strong>{money(Number(ledger.total_paid_cents))}</strong></div>
      </div>
    </section>

    <section className="board-section shell">
      <div className="section-bar">
        <div><span>Board</span><h2>Live demand</h2></div>
        <Link href="/explore">Full market</Link>
      </div>
      <div className="board-head">
        <span>#</span><span>Company</span><span>Customer</span><span>Reward</span><span>Pool</span><span>Left</span><span>Clicks</span><span>Status</span>
      </div>
      <div className="board-list">
        {bounties.length
          ? bounties.map((bounty, index) => <BountyCard bounty={bounty} rank={index + 1} key={bounty.id} />)
          : <div className="board-empty">
              <span>The board is open</span>
              <strong>First listing takes #1.</strong>
              <p>We do not invent demand. The first paid campaign becomes the top of the market automatically.</p>
            </div>}
      </div>
      <p className="board-rule">Rank is the reward. Highest paying campaign sits at #1. A payout enters the ledger only after settlement succeeds.</p>
    </section>

    <section className="split-boards shell">
      <div>
        <div className="section-bar"><div><span>Tape</span><h2>Public ledger</h2></div><Link href="/ledger">Open ledger</Link></div>
        <div className="ledger-table">
          <div className="ledger-head"><span>Time</span><span>Company</span><span>Referrer</span><span>Amount</span></div>
          {payouts.length ? payouts.map((payout, index) => <div className="ledger-row" key={`${payout.paid_at}-${index}`}>
            <span>{new Date(payout.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <Link href={`/b/${payout.slug}`}>{payout.company_name}</Link>
            <span>@{payout.x_handle}{payout.rainmaker && <b className="rainmaker">Rainmaker</b>}</span>
            <strong>{money(payout.reward_cents)}</strong>
          </div>) : <div className="empty-ledger">Awaiting first settlement. No fake transactions.</div>}
        </div>
      </div>
      <div>
        <div className="section-bar"><div><span>People</span><h2>Rainmakers</h2></div><Link href="/network">Earn</Link></div>
        <div className="ledger-table">
          <div className="ledger-head rainmaker-head"><span>#</span><span>Handle</span><span>Customers</span><span>Paid</span></div>
          {rainmakers.length ? rainmakers.map((person, index) => <div className="ledger-row rainmaker-row" key={person.x_handle}>
            <span className={index === 0 ? "board-rank top" : "board-rank"}>{String(index + 1).padStart(2, "0")}</span>
            <span>@{person.x_handle}</span>
            <span>{person.approved}</span>
            <strong>{money(person.paid_cents)}</strong>
          </div>) : <div className="empty-ledger">Rainmakers appear after {config.rainmakerThreshold} approved customers. Reputation is earned, not assigned.</div>}
        </div>
      </div>
    </section>
  </main>;
}
