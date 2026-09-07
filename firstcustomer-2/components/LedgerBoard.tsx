"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicPayout } from "@/lib/db";
import CountUp from "@/components/CountUp";
import LedgerRow from "@/components/LedgerRow";

export default function LedgerBoard({
  payouts,
  totalPaidCents,
  payoutCount,
  companiesPaid,
}: {
  payouts: PublicPayout[];
  totalPaidCents: number;
  payoutCount: number;
  companiesPaid: number;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return payouts;
    return payouts.filter((row) => [row.company_name, row.headline, row.x_handle, row.creator_x_handle || ""].join(" ").toLowerCase().includes(needle));
  }, [payouts, q]);

  return <>
    <div className="ledger-summary big">
      <div><span>Total paid</span><strong><CountUp cents={totalPaidCents} /></strong></div>
      <div><span>Payouts</span><strong><CountUp cents={payoutCount} moneyFormat={false} /></strong></div>
      <div><span>Companies</span><strong><CountUp cents={companiesPaid} moneyFormat={false} /></strong></div>
    </div>

    {payouts.length > 0 && <form className="admin-filters" onSubmit={(event) => event.preventDefault()}>
      <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search company, campaign, or handle" />
    </form>}

    <div className="proof-table">
      <div className="proof-head"><span>When</span><span>Campaign</span><span>Paid by → earned by</span><span>Source</span><span>Amount</span></div>
      {filtered.length
        ? filtered.map((payout, index) => <LedgerRow payout={payout} key={`${payout.paid_at}-${payout.x_handle}-${index}`} />)
        : payouts.length
          ? <div className="empty-ledger">No rows match that search.</div>
          : <div className="board-empty">
              <span>The tape is empty</span>
              <strong>The first successful transfer becomes line one.</strong>
              <p>We will not pre-populate this. When Stripe confirms a payout, this page will show the time, campaign, founder, referrer, amount, and the X post if one was attached.</p>
              <Link className="button launch-button" href="/create">Run the first campaign →</Link>
            </div>}
    </div>
  </>;
}
