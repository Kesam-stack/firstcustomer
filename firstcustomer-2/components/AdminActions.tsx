"use client";

import { useState } from "react";

export function CampaignActions({ id, status, featured, paid }: { id: string; status: string; featured: boolean; paid: boolean }) {
  const [busy, setBusy] = useState("");
  async function send(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    const response = await fetch(`/api/admin/campaigns/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setBusy("");
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return alert(data.error || "Could not update campaign");
    }
    location.reload();
  }

  return <div className="two-actions">
    {status !== "active" && paid && <button className="tiny-button" disabled={!!busy} onClick={() => send("status", { status: "active" })}>Activate</button>}
    {status === "active" && <button className="tiny-button" disabled={!!busy} onClick={() => send("status", { status: "paused" })}>Pause</button>}
    {status !== "closed" && <button className="tiny-button" disabled={!!busy} onClick={() => send("status", { status: "closed" })}>Close</button>}
    <button className="tiny-button" disabled={!!busy} onClick={() => send("feature", { featured: !featured })}>{featured ? "Unfeature" : "Feature"}</button>
  </div>;
}

export function PayoutRetry({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  if (status === "paid" || status === "manual_due") return null;
  async function retry() {
    setBusy(true);
    const response = await fetch(`/api/admin/payouts/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return alert(data.error || "Retry failed");
    alert(data.status === "paid" ? "Paid." : `Status: ${data.status}${data.error ? ` — ${data.error}` : ""}`);
    location.reload();
  }
  return <button className="tiny-button" disabled={busy} onClick={retry}>{busy ? "Retrying…" : "Retry payout"}</button>;
}

export function MemberStatus({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  async function setStatus(next: string) {
    setBusy(true);
    const response = await fetch(`/api/admin/network/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!response.ok) return alert("Could not update member");
    location.reload();
  }
  return status === "active"
    ? <button className="tiny-button" disabled={busy} onClick={() => setStatus("paused")}>Pause</button>
    : <button className="tiny-button" disabled={busy} onClick={() => setStatus("active")}>Activate</button>;
}
