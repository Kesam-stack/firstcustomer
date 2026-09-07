import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { adminListReferrals } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminReferrals() {
  if (!await isAdmin()) redirect("/admin/login");
  let rows = [] as Awaited<ReturnType<typeof adminListReferrals>>;
  try { rows = await adminListReferrals(); } catch {}

  return <main className="shell page">
    <div className="page-heading">
      <span className="eyebrow">People</span>
      <h1>Referrals.</h1>
    </div>
    <div className="table-card">
      <div className="table-scroll"><table>
        <thead><tr><th>Handle</th><th>Email</th><th>Campaign</th><th>Clicks</th><th>Approved</th><th>Earned</th><th>Paid</th><th>Stripe</th></tr></thead>
        <tbody>{rows.length ? rows.map((row) => <tr key={row.id}>
          <td>@{row.x_handle}</td>
          <td>{row.contact_email}</td>
          <td><Link href={`/b/${row.slug}`}>{row.company_name}</Link></td>
          <td>{row.clicks}</td>
          <td>{row.approved_conversions}</td>
          <td>{money(row.earned_cents)}</td>
          <td>{money(row.paid_cents)}</td>
          <td>{row.payouts_enabled ? "Ready" : "No"}</td>
        </tr>) : <tr><td colSpan={8}>No referrals.</td></tr>}</tbody>
      </table></div>
    </div>
  </main>;
}
