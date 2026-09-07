import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { adminListCampaigns } from "@/lib/db";
import { money, remaining } from "@/lib/format";
import { isFunded } from "@/lib/market";
import { CampaignActions } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminCampaigns({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  if (!await isAdmin()) redirect("/admin/login");
  const params = await searchParams;
  const status = params.status || "";
  const q = params.q || "";
  let rows = [] as Awaited<ReturnType<typeof adminListCampaigns>>;
  try { rows = await adminListCampaigns(status || undefined, q || undefined); } catch {}
  const filters = ["", "draft", "active", "paused", "closed"];

  return <main className="shell page">
    <div className="page-heading">
      <span className="eyebrow">Campaigns</span>
      <h1>Every listing.</h1>
    </div>
    <form className="admin-filters" method="get">
      <input name="q" defaultValue={q} placeholder="Search company, slug, email" />
      <select name="status" defaultValue={status}>
        {filters.map((item) => <option key={item || "all"} value={item}>{item || "All statuses"}</option>)}
      </select>
      <button className="button" type="submit">Filter</button>
    </form>
    <div className="table-card">
      <div className="table-scroll">
        <table>
          <thead><tr><th>Company</th><th>Status</th><th>Reward</th><th>Left</th><th>Payout</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row) => <tr key={row.id}>
              <td><Link href={`/admin/campaigns/${row.id}`}><b>{row.company_name}</b></Link><div className="fineprint">{row.slug}{row.is_featured ? " · featured" : ""}</div></td>
              <td><span className="status-pill">{row.status}</span></td>
              <td>{money(row.reward_cents)}</td>
              <td>{remaining(row.goal_count, row.approved_count)}</td>
              <td>{isFunded(row) ? "Funded" : row.payout_mode}</td>
              <td>{row.creator_email}</td>
              <td><CampaignActions id={row.id} status={row.status} featured={row.is_featured} paid={row.payment_verified} /></td>
            </tr>) : <tr><td colSpan={7}>No campaigns.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </main>;
}
