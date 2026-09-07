import { listPublicPayouts, publicLedgerStats } from "@/lib/db";
import LedgerBoard from "@/components/LedgerBoard";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  let payouts = [] as Awaited<ReturnType<typeof listPublicPayouts>>;
  let stats = { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };
  try { [payouts, stats] = await Promise.all([listPublicPayouts(200), publicLedgerStats()]); } catch {}

  return <main className="shell page">
    <div className="ledger-hero">
      <span className="eyebrow">Public ledger</span>
      <h1>Proof, not testimonials.</h1>
      <p>Every row is a Stripe transfer FirstCustomer recorded as paid. Failed, pending and manual-due rewards are not counted. We will not pre-populate it.</p>
    </div>
    <LedgerBoard
      payouts={payouts}
      totalPaidCents={Number(stats.total_paid_cents)}
      payoutCount={stats.payout_count}
      companiesPaid={stats.companies_paid}
    />
  </main>;
}
