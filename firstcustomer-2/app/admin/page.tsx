import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { adminAnalyticsOverview, adminOverview } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!await isAdmin()) redirect("/admin/login");
  let stats = {
    campaigns: 0, active: 0, drafts: 0, paused: 0, closed: 0,
    referrals: 0, members: 0, conversions: 0, paid: 0, failed: 0, pending: 0,
    paid_cents: "0", launch_fees_cents: "0",
  };
  let traffic = {
    page_views_24h: 0, visitors_24h: 0, sessions_24h: 0, active_visitors_15m: 0,
    page_views_7d: 0, visitors_7d: 0, page_views_30d: 0, visitors_30d: 0,
    network_active_15m: 0, joins_7d: 0, claims_7d: 0, referral_clicks_7d: 0,
    conversions_7d: 0, approved_7d: 0, payouts_7d: 0, payout_cents_7d: "0",
    campaigns_created_7d: 0,
  };
  try {
    const [overview, analytics] = await Promise.all([adminOverview(), adminAnalyticsOverview()]);
    if (overview) stats = overview;
    if (analytics) traffic = analytics;
  } catch {}

  return <main className="shell page">
    <div className="page-heading admin-heading-row">
      <div>
        <span className="eyebrow">Overview</span>
        <h1>Command center.</h1>
        <p>Live operations across traffic, campaigns, network, conversion risk, and settlement.</p>
      </div>
      <Link className="button launch-button" href="/admin/analytics">Traffic & funnel →</Link>
    </div>

    <div className="admin-live-strip">
      <div><span>Visitors active · 15m</span><strong>{traffic.active_visitors_15m}</strong></div>
      <div><span>Network active · 15m</span><strong>{traffic.network_active_15m}</strong></div>
      <div><span>Unique visitors · 24h</span><strong>{traffic.visitors_24h}</strong><small>{traffic.page_views_24h} views</small></div>
    </div>

    <div className="ledger-summary big">
      <div><span>Launch fees</span><strong>{money(Number(stats.launch_fees_cents))}</strong></div>
      <div><span>Verified rewards paid</span><strong>{money(Number(stats.paid_cents))}</strong></div>
      <div><span>Failed payouts</span><strong>{stats.failed}</strong></div>
    </div>

    <div className="admin-grid">
      <Link href="/admin/analytics" className="admin-stat"><span>Traffic · 7d</span><strong>{traffic.visitors_7d}</strong><small>{traffic.page_views_7d} page views · {traffic.sessions_24h} sessions today</small></Link>
      <Link href="/admin/campaigns" className="admin-stat"><span>Campaigns</span><strong>{stats.campaigns}</strong><small>{stats.active} live · {stats.drafts} draft · {stats.paused} paused · {stats.closed} closed</small></Link>
      <Link href="/admin/payouts" className="admin-stat"><span>Conversions</span><strong>{stats.conversions}</strong><small>{stats.paid} paid · {stats.pending} pending · {stats.failed} failed</small></Link>
      <Link href="/admin/referrals" className="admin-stat"><span>Referrals</span><strong>{stats.referrals}</strong><small>{traffic.referral_clicks_7d} clicks in 7 days</small></Link>
      <Link href="/admin/network" className="admin-stat"><span>Network</span><strong>{stats.members}</strong><small>{traffic.joins_7d} joins in 7 days · {traffic.network_active_15m} active recently</small></Link>
      <Link href="/admin/analytics" className="admin-stat"><span>Mission claims · 7d</span><strong>{traffic.claims_7d}</strong><small>{traffic.conversions_7d} conversions reported</small></Link>
    </div>
  </main>;
}
