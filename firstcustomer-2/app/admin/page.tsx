import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { adminOverview } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!await isAdmin()) redirect("/admin/login");
  let stats = {
    campaigns: 0, active: 0, drafts: 0, paused: 0, closed: 0,
    referrals: 0, members: 0, conversions: 0, paid: 0, failed: 0, pending: 0,
    paid_cents: "0", launch_fees_cents: "0",
  };
  try {
    stats = await adminOverview() ?? stats;
  } catch {}

  return <main className="shell page">
    <div className="page-heading">
      <span className="eyebrow">Overview</span>
      <h1>Command center.</h1>
      <p>Live operations across campaigns, settlement, and the network.</p>
    </div>
    <div className="ledger-summary big">
      <div><span>Launch fees</span><strong>{money(Number(stats.launch_fees_cents))}</strong></div>
      <div><span>Paid through ledger</span><strong>{money(Number(stats.paid_cents))}</strong></div>
      <div><span>Failed payouts</span><strong>{stats.failed}</strong></div>
    </div>
    <div className="admin-grid">
      <Link href="/admin/campaigns" className="admin-stat"><span>Campaigns</span><strong>{stats.campaigns}</strong><small>{stats.active} live · {stats.drafts} draft · {stats.paused} paused · {stats.closed} closed</small></Link>
      <Link href="/admin/payouts" className="admin-stat"><span>Conversions</span><strong>{stats.conversions}</strong><small>{stats.paid} paid · {stats.pending} pending · {stats.failed} failed</small></Link>
      <Link href="/admin/referrals" className="admin-stat"><span>Referrals</span><strong>{stats.referrals}</strong><small>Claimed links</small></Link>
      <Link href="/admin/network" className="admin-stat"><span>Network</span><strong>{stats.members}</strong><small>Members</small></Link>
    </div>
  </main>;
}
