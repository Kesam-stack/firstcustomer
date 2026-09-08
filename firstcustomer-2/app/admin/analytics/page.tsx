import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import {
  adminAnalyticsOverview,
  adminDeviceBreakdown,
  adminRecentPageViews,
  adminTopPages,
  adminTrafficSeries,
  adminTrafficSources,
} from "@/lib/db";
import { absoluteTime, money } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACTIVE_TARGET = 50;

export default async function AdminAnalytics() {
  if (!await isAdmin()) redirect("/admin/login");

  let overview = {
    page_views_24h: 0, visitors_24h: 0, sessions_24h: 0, active_visitors_15m: 0,
    page_views_7d: 0, visitors_7d: 0, page_views_30d: 0, visitors_30d: 0,
    network_active_15m: 0, joins_7d: 0, claims_7d: 0, referral_clicks_7d: 0,
    conversions_7d: 0, approved_7d: 0, payouts_7d: 0, payout_cents_7d: "0",
    campaigns_created_7d: 0,
  };
  let topPages = [] as Awaited<ReturnType<typeof adminTopPages>>;
  let sources = [] as Awaited<ReturnType<typeof adminTrafficSources>>;
  let devices = [] as Awaited<ReturnType<typeof adminDeviceBreakdown>>;
  let series = [] as Awaited<ReturnType<typeof adminTrafficSeries>>;
  let recent = [] as Awaited<ReturnType<typeof adminRecentPageViews>>;

  try {
    const [o, p, s, d, ts, r] = await Promise.all([
      adminAnalyticsOverview(),
      adminTopPages(7, 15),
      adminTrafficSources(7, 12),
      adminDeviceBreakdown(7),
      adminTrafficSeries(14),
      adminRecentPageViews(40),
    ]);
    if (o) overview = o;
    topPages = p; sources = s; devices = d; series = ts; recent = r;
  } catch {}

  const targetPct = Math.min(100, Math.round((overview.network_active_15m / ACTIVE_TARGET) * 100));
  const visitToJoin = overview.visitors_7d > 0 ? (overview.joins_7d / overview.visitors_7d) * 100 : 0;
  const claimToConversion = overview.claims_7d > 0 ? (overview.conversions_7d / overview.claims_7d) * 100 : 0;

  return <main className="shell page">
    <div className="page-heading admin-heading-row">
      <div>
        <span className="eyebrow">Analytics</span>
        <h1>Traffic & funnel.</h1>
        <p>First-party anonymous traffic plus the actual acquisition and payout funnel.</p>
      </div>
      <Link className="button secondary" href="/admin">Command center</Link>
    </div>

    <div className="admin-live-strip">
      <div>
        <span>Active visitors · 15m</span>
        <strong>{overview.active_visitors_15m}</strong>
      </div>
      <div>
        <span>Network members active · 15m</span>
        <strong>{overview.network_active_15m}</strong>
      </div>
      <div className="active-target">
        <span>Activity target</span>
        <strong>{overview.network_active_15m} / {ACTIVE_TARGET}</strong>
        <div className="target-track"><i style={{ width: `${targetPct}%` }} /></div>
      </div>
    </div>

    <section className="admin-section">
      <div className="section-bar"><div><span>Audience</span><h2>Who accessed FirstCustomer</h2></div><span className="admin-period">rolling windows</span></div>
      <div className="admin-grid analytics-grid">
        <div className="admin-stat"><span>Unique visitors · 24h</span><strong>{overview.visitors_24h}</strong><small>{overview.page_views_24h} page views · {overview.sessions_24h} sessions</small></div>
        <div className="admin-stat"><span>Unique visitors · 7d</span><strong>{overview.visitors_7d}</strong><small>{overview.page_views_7d} page views</small></div>
        <div className="admin-stat"><span>Unique visitors · 30d</span><strong>{overview.visitors_30d}</strong><small>{overview.page_views_30d} page views</small></div>
        <div className="admin-stat"><span>Pages / visitor · 7d</span><strong>{overview.visitors_7d ? (overview.page_views_7d / overview.visitors_7d).toFixed(1) : "0.0"}</strong><small>Anonymous first-party measurement</small></div>
      </div>
    </section>

    <section className="admin-section">
      <div className="section-bar"><div><span>Funnel</span><h2>From visit to payout</h2></div><span className="admin-period">last 7 days</span></div>
      <div className="funnel-grid">
        <div><span>Visitors</span><strong>{overview.visitors_7d}</strong></div>
        <b>→</b>
        <div><span>Network joins</span><strong>{overview.joins_7d}</strong><small>{visitToJoin.toFixed(1)}% of visitors</small></div>
        <b>→</b>
        <div><span>Mission claims</span><strong>{overview.claims_7d}</strong></div>
        <b>→</b>
        <div><span>Conversions</span><strong>{overview.conversions_7d}</strong><small>{claimToConversion.toFixed(1)}% of claims</small></div>
        <b>→</b>
        <div><span>Approved</span><strong>{overview.approved_7d}</strong></div>
        <b>→</b>
        <div><span>Paid</span><strong>{overview.payouts_7d}</strong><small>{money(Number(overview.payout_cents_7d))}</small></div>
      </div>
      <div className="analytics-support-row">
        <div><span>Referral clicks · 7d</span><strong>{overview.referral_clicks_7d}</strong></div>
        <div><span>Campaigns created · 7d</span><strong>{overview.campaigns_created_7d}</strong></div>
      </div>
    </section>

    <section className="admin-section">
      <div className="section-bar"><div><span>Trend</span><h2>14-day traffic</h2></div></div>
      <div className="traffic-series">
        {series.map((row) => {
          const max = Math.max(1, ...series.map((x) => x.views));
          const height = Math.max(4, Math.round((row.views / max) * 100));
          return <div className="traffic-day" key={row.day} title={`${row.day}: ${row.views} views · ${row.visitors} visitors`}>
            <div className="traffic-bar"><i style={{ height: `${height}%` }} /></div>
            <strong>{row.views}</strong>
            <span>{row.day.slice(5)}</span>
          </div>;
        })}
      </div>
    </section>

    <div className="admin-analytics-split">
      <section className="admin-section">
        <div className="section-bar"><div><span>Pages</span><h2>Top pages</h2></div><span className="admin-period">7d</span></div>
        <div className="analytics-list">
          {topPages.length ? topPages.map((row) => <div key={row.path}>
            <code>{row.path}</code><span>{row.visitors} visitors</span><strong>{row.views}</strong>
          </div>) : <p className="empty-ledger">Traffic starts populating after this deployment.</p>}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-bar"><div><span>Acquisition</span><h2>Traffic sources</h2></div><span className="admin-period">7d</span></div>
        <div className="analytics-list">
          {sources.length ? sources.map((row) => <div key={row.source}>
            <code>{row.source}</code><span>{row.visitors} visitors</span><strong>{row.views}</strong>
          </div>) : <p className="empty-ledger">No source data yet.</p>}
        </div>
      </section>
    </div>

    <div className="admin-analytics-split">
      <section className="admin-section">
        <div className="section-bar"><div><span>Devices</span><h2>Device mix</h2></div><span className="admin-period">7d</span></div>
        <div className="analytics-list">
          {devices.length ? devices.map((row) => <div key={row.device_type}>
            <code>{row.device_type}</code><span>{row.visitors} visitors</span><strong>{row.views}</strong>
          </div>) : <p className="empty-ledger">No device data yet.</p>}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-bar"><div><span>Live feed</span><h2>Recent page access</h2></div></div>
        <div className="recent-traffic">
          {recent.length ? recent.map((row, index) => <div key={`${row.created_at}-${index}`}>
            <div><code>{row.path}</code><small>{row.source} · {row.device_type}</small></div>
            <time>{absoluteTime(row.created_at)}</time>
          </div>) : <p className="empty-ledger">No page views recorded yet.</p>}
        </div>
      </section>
    </div>

    <p className="fineprint analytics-privacy-note">Unique visitors are anonymous browser identifiers hashed with a server-side HMAC. FirstCustomer analytics does not store raw IP addresses or private query strings.</p>
  </main>;
}
