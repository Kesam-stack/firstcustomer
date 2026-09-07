import Link from "next/link";
import { listPublicPayouts, publicLedgerStats } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  let payouts = [] as Awaited<ReturnType<typeof listPublicPayouts>>;
  let stats = { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };
  try { [payouts, stats] = await Promise.all([listPublicPayouts(100), publicLedgerStats()]); } catch {}

  return <main className="shell page">
    <div className="ledger-hero">
      <span className="eyebrow">Public ledger</span>
      <h1>Proof, not testimonials.</h1>
      <p>Every row is a transfer FirstCustomer recorded as paid. Failed, pending and manual-due rewards are not counted.</p>
    </div>

    <div className="ledger-summary big">
      <div><span>Total paid</span><strong>{money(Number(stats.total_paid_cents))}</strong></div>
      <div><span>Payouts</span><strong>{stats.payout_count}</strong></div>
      <div><span>Companies</span><strong>{stats.companies_paid}</strong></div>
    </div>

    <div className="ledger-table full-ledger">
      <div className="ledger-head"><span>Date</span><span>Company</span><span>Referrer</span><span>Amount</span></div>
      {payouts.length ? payouts.map((payout, index) => <div className="ledger-row" key={`${payout.paid_at}-${index}`}>
        <span>{new Date(payout.paid_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
        <Link href={`/b/${payout.slug}`}>{payout.company_name}</Link>
        <span>@{payout.x_handle}{payout.rainmaker && <b className="rainmaker">Rainmaker</b>}</span>
        <strong>{money(payout.reward_cents)}</strong>
      </div>) : <div className="empty-ledger">The tape is empty. The first successful transfer becomes line one. We will not pre-populate it.</div>}
    </div>
  </main>;
}
