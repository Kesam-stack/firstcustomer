"use client";

import { useState } from "react";
import type { Bounty, Referral } from "@/lib/types";
import { money } from "@/lib/format";

export default function FounderDashboard({ bounty, referrals, ownerKey }: { bounty: Bounty; referrals: Referral[]; ownerKey: string }) {
  const [rows, setRows] = useState(referrals);
  const [message, setMessage] = useState("");
  const publicUrl = `${windowOrigin()}/b/${bounty.slug}`;

  async function approve(referralId: string) {
    const customerReference = window.prompt("Customer reference (email, invoice ID, CRM ID, etc.)");
    if (!customerReference) return;
    setMessage("");
    const res = await fetch(`/api/manage/${bounty.id}/conversion`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-owner-key": ownerKey },
      body: JSON.stringify({ referralId, customerReference }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Could not approve conversion"); return; }
    setRows(r => r.map(x => x.id === referralId ? { ...x, approved_conversions: x.approved_conversions + 1 } : x));
    setMessage("Conversion approved. Remember: you are responsible for paying the referrer directly.");
  }

  return (
    <main className="shell page-pad">
      <div className="dashboard-head"><div><div className="eyebrow">FOUNDER DASHBOARD</div><h1>{bounty.company_name}</h1><p className="muted">{bounty.headline}</p></div><a className="button dark" href={`/b/${bounty.slug}`} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">View public bounty ↗</a></div>
      <div className="stats"><div><span>APPROVED</span><strong>{bounty.approved_count}</strong></div><div><span>GOAL</span><strong>{bounty.goal_count}</strong></div><div><span>REWARD</span><strong>{money(bounty.reward_cents)}</strong></div><div><span>STATUS</span><strong>{bounty.status}</strong></div></div>
      <div className="share-strip"><span>Public URL</span><code>{publicUrl}</code><button onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy</button></div>
      {message && <div className="notice">{message}</div>}
      <section className="table-card">
        <div className="table-head"><h2>Referrers</h2><span>{rows.length} total</span></div>
        {rows.length === 0 ? <div className="empty">No one has claimed a referral link yet. Post the public bounty on X.</div> : (
          <div className="table-scroll"><table><thead><tr><th>Referrer</th><th>Code</th><th>Clicks</th><th>Approved</th><th>Earned*</th><th></th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>@{r.x_handle}</td><td><code>{r.code}</code></td><td>{r.clicks}</td><td>{r.approved_conversions}</td><td>{money(r.approved_conversions * bounty.reward_cents)}</td><td><button className="tiny-button" onClick={() => approve(r.id)}>+ approve customer</button></td></tr>)}</tbody></table></div>
        )}
        <p className="fineprint">*Informational only. FirstCustomer does not custody or transmit bounty funds. You must pay eligible referrers yourself and keep appropriate records.</p>
      </section>
    </main>
  );
}

function windowOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "";
}
