import Link from "next/link";
import { listMarketplaceBounties, marketplaceStats, listPublicPayouts, publicLedgerStats } from "@/lib/db";
import BountyCard from "@/components/BountyCard";
import QuickLaunch from "@/components/QuickLaunch";
import { money } from "@/lib/format";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  let bounties = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  let payouts = [] as Awaited<ReturnType<typeof listPublicPayouts>>;
  let stats = { campaigns: 0, open_reward_cents: "0", network_members: 0 };
  let ledger = { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };

  try {
    [bounties, payouts, stats, ledger] = await Promise.all([
      listMarketplaceBounties(5),
      listPublicPayouts(6),
      marketplaceStats(),
      publicLedgerStats(),
    ]);
  } catch {}

  return <main>
    <section className="hero shell">
      <div className="hero-copy">
        <div className="eyebrow">Customer acquisition market</div>
        <h1>Pay for customers.<br/>Not clicks.</h1>
        <p>Set the outcome and the price. FirstCustomer puts the offer in front of people who can deliver it, tracks attribution, and records the payout.</p>
        <div className="hero-links"><Link href="/explore">Browse the market ↗</Link><Link href="/ledger">See every payout ↗</Link></div>
      </div>
      <QuickLaunch minimumRewardDollars={config.minimumRewardCents / 100} />
    </section>

    <section className="ticker">
      <div className="shell ticker-inner">
        <div><span>Open reward pool</span><strong>{money(Number(stats.open_reward_cents))}</strong></div>
        <div><span>Live campaigns</span><strong>{stats.campaigns}</strong></div>
        <div><span>Network members</span><strong>{stats.network_members}</strong></div>
        <div><span>Paid through ledger</span><strong>{money(Number(ledger.total_paid_cents))}</strong></div>
      </div>
    </section>

    <section className="market-section shell">
      <div className="section-bar"><div><span>01</span><h2>Live market</h2></div><Link href="/explore">View all campaigns</Link></div>
      <div className="market-header"><span>Company</span><span>Mission</span><span>Reward</span><span>Remaining</span><span>Status</span><span></span></div>
      <div className="market-list">
        {bounties.length ? bounties.map((bounty) => <BountyCard bounty={bounty} key={bounty.id} />) : <div className="empty-state"><strong>No campaigns are live yet.</strong><span>The first paid campaign will appear here automatically. We do not invent demand.</span></div>}
      </div>
    </section>

    <section className="ledger-section shell">
      <div className="section-bar"><div><span>02</span><h2>Public payout ledger</h2></div><Link href="/ledger">Open ledger</Link></div>
      <div className="ledger-summary"><div><span>Total paid</span><strong>{money(Number(ledger.total_paid_cents))}</strong></div><div><span>Successful payouts</span><strong>{ledger.payout_count}</strong></div><div><span>Companies paid</span><strong>{ledger.companies_paid}</strong></div></div>
      <div className="ledger-table">
        <div className="ledger-head"><span>Time</span><span>Company</span><span>Referrer</span><span>Amount</span></div>
        {payouts.length ? payouts.map((payout, index) => <div className="ledger-row" key={`${payout.paid_at}-${index}`}>
          <span>{new Date(payout.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <Link href={`/b/${payout.slug}`}>{payout.company_name}</Link>
          <span>@{payout.x_handle}{payout.rainmaker && <b className="rainmaker">Rainmaker</b>}</span>
          <strong>{money(payout.reward_cents)}</strong>
        </div>) : <div className="empty-ledger">No payout has been recorded yet. The first successful transfer becomes the first line of the ledger.</div>}
      </div>
    </section>

    <section className="mechanism shell">
      <div className="section-bar"><div><span>03</span><h2>The mechanism</h2></div></div>
      <div className="mechanism-grid">
        <article><span>Company</span><h3>Price the outcome</h3><p>Define exactly what counts as a customer and what one verified conversion is worth.</p></article>
        <article><span>FirstCustomer</span><h3>Route the offer</h3><p>The campaign enters the market and is matched to relevant people. The founder does not have to post it.</p></article>
        <article><span>Referrer</span><h3>Claim distribution</h3><p>Get a tracked link, send qualified traffic, and see clicks, approvals and earnings.</p></article>
        <article><span>Settlement</span><h3>Make trust visible</h3><p>Successful payouts enter the public ledger. No fake counters, no anonymous “social proof.”</p></article>
      </div>
    </section>
  </main>;
}
