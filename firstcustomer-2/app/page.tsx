import Link from "next/link";
import { listMarketplaceBounties, marketplaceStats, listPublicPayouts, publicLedgerStats, listRainmakers } from "@/lib/db";
import BountyCard from "@/components/BountyCard";
import QuickLaunch from "@/components/QuickLaunch";
import { money } from "@/lib/format";
import LedgerRow from "@/components/LedgerRow";
import CountUp from "@/components/CountUp";
import MarketHeat from "@/components/MarketHeat";
import { config } from "@/lib/config";
import { rankFunded } from "@/lib/market";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const emptyStats = { campaigns: 0, open_reward_cents: "0", network_members: 0, active_recently: 0, highest_reward_cents: "0", click_count: 0 };
const emptyLedger = { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };

export default async function Home() {
  let bounties = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  let payouts = [] as Awaited<ReturnType<typeof listPublicPayouts>>;
  let rainmakers = [] as Awaited<ReturnType<typeof listRainmakers>>;
  let stats = emptyStats;
  let ledger = emptyLedger;

  try {
    [bounties, payouts, rainmakers, stats, ledger] = await Promise.all([
      listMarketplaceBounties(8, "All", "reward"),
      listPublicPayouts(6),
      listRainmakers(6),
      marketplaceStats(),
      publicLedgerStats(),
    ]);
  } catch {}

  const successFee = config.platformFeeBps / 100;

  // A transparent activity index, not a user or traffic count.
  // Starts at 50 and accelerates as real marketplace activity compounds.
  const activityUnits =
    stats.active_recently * 4 +
    stats.campaigns * 3 +
    Math.sqrt(Math.max(0, stats.click_count)) * 1.5 +
    ledger.payout_count * 6 +
    Math.log1p(Math.max(0, Number(ledger.total_paid_cents)) / 100) * 2;
  const marketHeat = Math.round(50 + Math.pow(activityUnits, 1.18));

  return <main>
    <section className="board-top shell">
      <p className="board-kicker">Customer acquisition market</p>
      <div className="home-hero-grid">
        <div className="home-hero-copy">
          <h1>Pay for customers.<br />Not clicks.</h1>
          <p className="board-sub">Companies publish the exact customer outcome they want and the reward they will pay. People bring qualified customers. FirstCustomer tracks attribution and records the payout.</p>
          <div className="hero-role-actions">
            <Link className="button launch-button" href="/create">I need customers →</Link>
            <Link className="button secondary" href="/explore">I want to earn →</Link>
          </div>
        </div>
        <div className="hero-flow" aria-label="How FirstCustomer works">
          <span>01 Company sets outcome</span>
          <span>02 Referrer claims mission</span>
          <span>03 Customer is verified</span>
          <span>04 Reward is paid</span>
        </div>
      </div>

      <div className="home-launch">
        <div className="home-launch-head">
          <div><span>Launch a mission</span><strong>Price the customer you actually want.</strong></div>
          <p>{money(config.launchFeeCents)} launch · {successFee}% success fee · no monthly plan</p>
        </div>
        <QuickLaunch
          minimumRewardDollars={config.minimumRewardCents / 100}
          maximumRewardDollars={config.maximumRewardCents / 100}
          maximumGoalCount={config.maximumGoalCount}
        />
      </div>
    </section>

    <section className="board-meta">
      <div className="shell ticker-inner">
        <div><span>Open reward pool</span><strong>{money(Number(stats.open_reward_cents))}</strong></div>
        <div><span>Live missions</span><strong>{stats.campaigns}</strong></div>
        <div className="network-live-stat">
          <span>Network</span>
          <strong>{stats.network_members} members</strong>
          <small><i aria-hidden="true" /> {stats.active_recently} active recently</small>
        </div>
        <MarketHeat value={marketHeat} />
        <div><span>Verified rewards paid</span><strong><CountUp cents={Number(ledger.total_paid_cents)} /></strong></div>
      </div>
    </section>

    <section className="board-section shell">
      <div className="section-bar">
        <div><span>Market</span><h2>Live customer missions</h2></div>
        <Link href="/explore">See all missions</Link>
      </div>
      <div className="board-head">
        <span>#</span><span>Company</span><span>Customer</span><span>Reward</span><span>Pool</span><span>Left</span><span>Clicks</span><span>Claims</span><span>Status</span>
      </div>
      <div className="board-list">
        {bounties.length
          ? rankFunded(bounties).map(({ row, rank }) => <BountyCard bounty={row} rank={rank} key={row.id} />)
          : <div className="board-empty">
              <span>The market is open</span>
              <strong>First funded mission takes #1.</strong>
              <p>No seeded campaigns and no fake demand. The first real company to fund a customer mission becomes the market.</p>
              <Link className="button launch-button" href="/create">Post the first mission →</Link>
            </div>}
      </div>
      <p className="board-rule">The board ranks funded automatic-payout demand. A reward appears in the public ledger only after FirstCustomer records the Stripe transfer as paid.</p>
    </section>

    <section className="split-boards shell">
      <div>
        <div className="section-bar"><div><span>Proof</span><h2>Recent payouts</h2></div><Link href="/ledger">Public ledger</Link></div>
        <div className="proof-table compact">
          {payouts.length
            ? payouts.map((payout) => <LedgerRow compact payout={payout} key={payout.id} />)
            : <div className="empty-ledger">Awaiting the first verified payout. We do not manufacture proof.</div>}
        </div>
      </div>
      <div>
        <div className="section-bar"><div><span>People</span><h2>Rainmakers</h2></div><Link href="/leaderboard">Leaderboard</Link></div>
        <div className="ledger-table">
          <div className="ledger-head rainmaker-head"><span>#</span><span>Handle</span><span>Customers</span><span>Paid</span></div>
          {rainmakers.length ? rainmakers.map((person, index) => <div className="ledger-row rainmaker-row" key={person.identity_id || person.x_handle}>
            <span className={index === 0 ? "board-rank top" : "board-rank"}>{String(index + 1).padStart(2, "0")}</span>
            {person.identity_id ? <Link href={`/people/${person.identity_id}`}>@{person.x_handle}</Link> : <span>@{person.x_handle}</span>}
            <span>{person.approved}</span>
            <strong>{money(person.paid_cents)}</strong>
          </div>) : <div className="empty-ledger">Rainmaker status starts after {config.rainmakerThreshold} approved customers. It cannot be purchased.</div>}
        </div>
      </div>
    </section>

    <section className="home-close shell">
      <Link href="/create" className="home-close-card">
        <span>For companies</span>
        <strong>Put a price on a qualified customer.</strong>
        <em>Launch a mission →</em>
      </Link>
      <Link href="/explore" className="home-close-card">
        <span>For referrers</span>
        <strong>Find a customer. Earn the reward.</strong>
        <em>Browse live missions →</em>
      </Link>
    </section>
  </main>;
}
