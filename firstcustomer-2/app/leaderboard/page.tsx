import type { Metadata } from "next";
import Link from "next/link";
import { listLeaderboard, publicLedgerStats } from "@/lib/db";
import { money, relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard — FirstCustomer",
  description: "A public ranking based on verified FirstCustomer payouts, not clicks or follower counts.",
  alternates: { canonical: "/leaderboard" },
};

export default async function LeaderboardPage() {
  let rows = [] as Awaited<ReturnType<typeof listLeaderboard>>;
  let stats = { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };
  try { [rows, stats] = await Promise.all([listLeaderboard(100), publicLedgerStats()]); } catch {}

  return <main className="shell page">
    <section className="leaderboard-hero">
      <div>
        <span className="eyebrow">Verified leaderboard</span>
        <h1>The board for people who close.</h1>
        <p>No followers, impressions, or self-reported revenue. Rank comes from rewards FirstCustomer has actually recorded as paid.</p>
      </div>
      <Link className="button launch-button" href="/explore">Compete for a mission →</Link>
    </section>

    <div className="leaderboard-summary">
      <div><span>Paid through ledger</span><strong>{money(Number(stats.total_paid_cents))}</strong></div>
      <div><span>Verified payouts</span><strong>{stats.payout_count}</strong></div>
      <div><span>Companies</span><strong>{stats.companies_paid}</strong></div>
    </div>

    <section className="leaderboard-table">
      <div className="leaderboard-head"><span>#</span><span>Referrer</span><span>Customers paid</span><span>Campaigns</span><span>Paid</span><span>Last win</span></div>
      {rows.length ? rows.map((row, index) => <Link className="leaderboard-row" href={`/people/${row.identity_id}`} key={row.identity_id}>
        <span className={index === 0 ? "board-rank top" : "board-rank"}>{String(index + 1).padStart(2, "0")}</span>
        <span className="leaderboard-person">@{row.x_handle}{row.rainmaker && <b className="rainmaker">Rainmaker</b>}</span>
        <span>{row.paid_customers}</span>
        <span>{row.campaigns_paid}</span>
        <strong>{money(row.paid_cents)}</strong>
        <span className="muted">{relativeTime(row.last_paid_at)}</span>
      </Link>) : <div className="board-empty">
        <span>The leaderboard is earned</span>
        <strong>First verified payout takes #1.</strong>
        <p>No seeded accounts. No fake earnings.</p>
        <Link className="button launch-button" href="/explore">Find a mission →</Link>
      </div>}
    </section>
  </main>;
}
