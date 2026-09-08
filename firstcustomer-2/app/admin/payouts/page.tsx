import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { adminListPayouts } from "@/lib/db";
import { money } from "@/lib/format";
import { PayoutRetry } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminPayouts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!await isAdmin()) redirect("/admin/login");
  const { status = "" } = await searchParams;
  let rows = [] as Awaited<ReturnType<typeof adminListPayouts>>;
  try { rows = await adminListPayouts(status || undefined); } catch {}
  const filters = ["", "paid", "failed", "payment_pending", "processing", "manual_due", "not_configured"];

  return <main className="shell page">
    <div className="page-heading">
      <span className="eyebrow">Settlement</span>
      <h1>Payouts.</h1>
    </div>
    <div className="market-controls">
      <div>{filters.map((item) => <Link key={item || "all"} className={status === item ? "control active" : "control"} href={item ? `/admin/payouts?status=${item}` : "/admin/payouts"}>{item || "All"}</Link>)}</div>
    </div>
    <div className="table-card">
      <div className="table-scroll"><table>
        <thead><tr><th>When</th><th>Company</th><th>Referrer</th><th>Customer</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.length ? rows.map((row) => <tr key={row.id}>
          <td>{new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
          <td><Link href={`/admin/campaigns/${row.bounty_id}`}>{row.company_name}</Link></td>
          <td>@{row.x_handle}</td>
          <td>{row.customer_reference}</td>
          <td>{money(row.reward_cents)}</td>
          <td><span className={`status-pill ${row.payout_status === "paid" ? "status-paid" : ""}`}>{row.payout_available_at && Date.parse(row.payout_available_at) > Date.now() ? `held until ${new Date(row.payout_available_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : row.payout_status}</span>{row.payout_error ? <div className="fineprint">{row.payout_error}</div> : null}</td>
          <td><PayoutRetry id={row.id} status={row.payout_status} /></td>
        </tr>) : <tr><td colSpan={7}>No payouts.</td></tr>}</tbody>
      </table></div>
    </div>
  </main>;
}
