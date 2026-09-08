import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { adminListMembers } from "@/lib/db";
import { MemberStatus } from "@/components/AdminActions";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminNetwork() {
  if (!await isAdmin()) redirect("/admin/login");
  let rows = [] as Awaited<ReturnType<typeof adminListMembers>>;
  try { rows = await adminListMembers(); } catch {}

  return <main className="shell page">
    <div className="page-heading">
      <span className="eyebrow">Network</span>
      <h1>Members.</h1>
    </div>
    <div className="table-card">
      <div className="table-scroll"><table>
        <thead><tr><th>Name</th><th>Handle</th><th>Email</th><th>Channels</th><th>Audience</th><th>Last seen</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.length ? rows.map((row) => <tr key={row.id}>
          <td><b>{row.display_name}</b><div className="fineprint">{row.country || ""}</div></td>
          <td>{row.x_handle ? `@${row.x_handle}` : "—"}</td>
          <td>{row.email}</td>
          <td>{row.channels.join(", ") || "—"}</td>
          <td>{row.audience_size}</td>
          <td>{row.last_seen_at ? <><b>{relativeTime(row.last_seen_at)}</b><div className="fineprint">{Date.now() - Date.parse(row.last_seen_at) < 15 * 60 * 1000 ? "Active recently" : "Inactive"}</div></> : "Never"}</td>
          <td><span className="status-pill">{row.status}</span></td>
          <td><MemberStatus id={row.id} status={row.status} /></td>
        </tr>) : <tr><td colSpan={8}>No members.</td></tr>}</tbody>
      </table></div>
    </div>
  </main>;
}
