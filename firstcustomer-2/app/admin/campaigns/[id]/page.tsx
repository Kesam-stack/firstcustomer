import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { getBountyById, listConversions, listReferrals, networkMatchCount } from "@/lib/db";
import { money } from "@/lib/format";
import { isFunded } from "@/lib/market";
import { CampaignActions, PayoutRetry } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminCampaign({ params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) redirect("/admin/login");
  const { id } = await params;
  const bounty = await getBountyById(id).catch(() => null);
  if (!bounty) notFound();
  const [referrals, conversions, matches] = await Promise.all([
    listReferrals(id),
    listConversions(id),
    networkMatchCount(id),
  ]);

  return <main className="shell page">
    <div className="dashboard-head">
      <div>
        <span className="eyebrow">Campaign</span>
        <h1>{bounty.company_name}</h1>
        <p className="muted">{bounty.headline} · {bounty.creator_email}</p>
      </div>
      <CampaignActions id={bounty.id} status={bounty.status} featured={bounty.is_featured} paid={bounty.payment_verified} />
    </div>
    <div className="stats">
      <div><span>Status</span><strong>{bounty.status}</strong></div>
      <div><span>Reward</span><strong>{money(bounty.reward_cents)}</strong></div>
      <div><span>Approved</span><strong>{bounty.approved_count}/{bounty.goal_count}</strong></div>
      <div><span>Payout</span><strong>{isFunded(bounty) ? "Funded" : bounty.payout_mode}</strong></div>
    </div>
    <p className="fineprint"><Link href={`/b/${bounty.slug}`}>Public page</Link> · {bounty.product_url} · {matches} network matches · {bounty.payment_verified ? "launch paid" : "unpaid"}{bounty.is_featured ? " · featured" : ""}</p>
    <div className="summary-box">
      <span>What qualifies</span>
      <p>{bounty.desired_action}</p>
      <span>Terms</span>
      <p>{bounty.referral_terms}</p>
    </div>
    <section className="table-card">
      <div className="table-head"><h2>Referrers</h2><span>{referrals.length}</span></div>
      <div className="table-scroll"><table>
        <thead><tr><th>Handle</th><th>Email</th><th>Clicks</th><th>Approved</th><th>Earned</th><th>Paid</th><th>Stripe</th></tr></thead>
        <tbody>{referrals.length ? referrals.map((row) => <tr key={row.id}>
          <td>@{row.x_handle}</td>
          <td>{row.contact_email}</td>
          <td>{row.clicks}</td>
          <td>{row.approved_conversions}</td>
          <td>{money(row.earned_cents)}</td>
          <td>{money(row.paid_cents)}</td>
          <td>{row.payouts_enabled ? "Ready" : "No"}</td>
        </tr>) : <tr><td colSpan={7}>None yet.</td></tr>}</tbody>
      </table></div>
    </section>
    <section className="table-card">
      <div className="table-head"><h2>Conversions</h2><span>{conversions.length}</span></div>
      <div className="table-scroll"><table>
        <thead><tr><th>Referrer</th><th>Customer ref</th><th>Reward</th><th>Payout</th><th></th></tr></thead>
        <tbody>{conversions.length ? conversions.map((row) => <tr key={row.id}>
          <td>@{row.x_handle}</td>
          <td>{row.customer_reference}</td>
          <td>{money(row.reward_cents)}</td>
          <td><span className={`status-pill ${row.payout_status === "paid" ? "status-paid" : ""}`}>{row.payout_status}</span>{row.payout_error ? <div className="fineprint">{row.payout_error}</div> : null}</td>
          <td><PayoutRetry id={row.id} status={row.payout_status} /></td>
        </tr>) : <tr><td colSpan={5}>None yet.</td></tr>}</tbody>
      </table></div>
    </section>
  </main>;
}
