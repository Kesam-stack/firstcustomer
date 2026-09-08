"use client";

import { useState } from "react";
import type { Bounty, Referral, Conversion } from "@/lib/types";
import { money } from "@/lib/format";
import { isHoldActive } from "@/lib/market";
import { siteUrl } from "@/lib/site";

export default function FounderDashboard({
  bounty,
  referrals,
  conversions,
  ownerKey,
  integrationKey,
  integrationPrefix,
  networkMatchCount,
  payoutReady,
  featuredFeeCents,
  featuredHoldDays,
  payoutDelayDays,
  checkoutNotice,
}: {
  bounty: Bounty;
  referrals: Referral[];
  conversions: Conversion[];
  ownerKey: string;
  integrationKey?: string;
  integrationPrefix?: string;
  networkMatchCount: number;
  payoutReady: boolean;
  featuredFeeCents: number;
  featuredHoldDays: number;
  payoutDelayDays: number;
  checkoutNotice?: string;
}) {
  const [message, setMessage] = useState(checkoutNotice || "");
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(integrationKey || "");
  const publicUrl = siteUrl(`/b/${bounty.slug}`);
  const holding = isHoldActive(bounty);
  const holdUntil = holding && bounty.featured_until
    ? new Date(bounty.featured_until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  async function approve(referralId: string) {
    const customerReference = prompt("Customer reference (CRM ID, invoice ID, email hash, etc.)");
    if (!customerReference) return;
    const response = await fetch(`/api/manage/${bounty.id}/conversion`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-owner-key": ownerKey },
      body: JSON.stringify({ referralId, customerReference }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Could not approve");
    if (data.payout?.status === "paid") setMessage("Conversion approved and reward paid.");
    else if (data.payout?.status === "held" && data.payout.availableAt) setMessage(`Conversion approved. Payout is held until ${new Date(data.payout.availableAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`);
    else setMessage(`Conversion approved. Payout status: ${data.payout?.status || "recorded"}.`);
    location.reload();
  }

  async function retry(conversionId: string) {
    const response = await fetch(`/api/manage/${bounty.id}/payout`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-owner-key": ownerKey },
      body: JSON.stringify({ conversionId }),
    });
    const data = await response.json();
    setMessage(data.status === "paid" ? "Reward paid successfully." : data.error || `Payout status: ${data.status}`);
    if (data.status === "paid") location.reload();
  }

  async function rotateKey() {
    if (!confirm("This replaces the Conversion API key. Old keys stop working immediately.")) return;
    const response = await fetch(`/api/manage/${bounty.id}/integration`, { method: "POST", headers: { "x-owner-key": ownerKey } });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Could not rotate key");
    setApiKey(data.integrationKey);
    setMessage("New Conversion API key created. Copy it now — it will not be shown again.");
  }

  async function refreshNetwork() {
    setRefreshing(true);
    const response = await fetch(`/api/manage/${bounty.id}/network`, { method: "POST", headers: { "x-owner-key": ownerKey } });
    const data = await response.json();
    setRefreshing(false);
    if (!response.ok) return setMessage(data.error || "Could not refresh network distribution");
    setMessage(`Network refreshed: ${data.matched} current matches, ${data.notified} alerts sent this pass.`);
    location.reload();
  }

  async function startCheckout(kind: "billing" | "featured") {
    setBusy(kind);
    setMessage("");
    try {
      const response = await fetch(`/api/manage/${bounty.id}/${kind}`, { method: "POST", headers: { "x-owner-key": ownerKey } });
      const data = await response.json();
      if (!response.ok) {
        setBusy(null);
        return setMessage(data.error || "Could not start checkout");
      }
      if (data.checkoutUrl) location.href = data.checkoutUrl;
      else setBusy(null);
    } catch {
      setBusy(null);
      setMessage("Could not start checkout");
    }
  }

  return <main className="shell page-pad">
    <div className="dashboard-head"><div><span>COMPANY COMMAND CENTER</span><h1>{bounty.company_name}</h1><p className="muted">{bounty.headline}</p></div><a className="button dark" href={`/b/${bounty.slug}`} target="_blank">View public mission ↗</a></div>

    <div className="distribution-card"><div><span>FIRSTCUSTOMER NETWORK</span><h2>Distribution is active.</h2><p>Your mission is discoverable inside FirstCustomer. External posting is optional.</p></div><div className="distribution-number"><strong>{networkMatchCount}</strong><span>members matched</span></div><button className="button secondary" disabled={refreshing || bounty.status !== "active"} onClick={refreshNetwork}>{refreshing ? "Refreshing…" : "Refresh matches"}</button></div>

    <div className="stats"><div><span>Approved</span><strong>{bounty.approved_count}</strong></div><div><span>Goal</span><strong>{bounty.goal_count}</strong></div><div><span>Reward</span><strong>{money(bounty.reward_cents)}</strong></div><div><span>Referrers</span><strong>{referrals.length}</strong></div></div>

    {!payoutReady && bounty.payout_mode === "stripe" && <div className="warning">No payout card on file. Approving a customer records the conversion but cannot pay the referrer until you add a card. You are charged the reward plus the FirstCustomer success fee when you approve.</div>}

    <div className="billing-grid">
      <div className="billing-card">
        <div>
          <span>PAYOUTS</span>
          <h2>{payoutReady ? "Card on file." : "Add a payout card."}</h2>
          <p>{payoutReady ? "Approving a customer charges this card, then pays the referrer the advertised reward." : "Complimentary listings skip the $9 launch fee. A card is still required to pay referrers."}</p>
        </div>
        <button className="button dark" disabled={busy !== null} onClick={() => startCheckout("billing")}>{busy === "billing" ? "Opening…" : payoutReady ? "Update card" : "Add card"}</button>
      </div>
      <div className="billing-card">
        <div>
          <span>BOARD</span>
          <h2>{holding ? `Holding #1 until ${holdUntil}.` : `Hold #1 for ${featuredHoldDays} days.`}</h2>
          <p>{holding ? `Pay ${money(featuredFeeCents)} to extend from the current expiry. Featured listings sit above funded rank.` : `Pay ${money(featuredFeeCents)} to pin this bounty at the top of the board for ${featuredHoldDays} days.`}</p>
        </div>
        <button className="button dark" disabled={busy !== null || bounty.status !== "active"} onClick={() => startCheckout("featured")}>{busy === "featured" ? "Opening…" : holding ? `Extend ${money(featuredFeeCents)}` : `Hold #1 · ${money(featuredFeeCents)}`}</button>
      </div>
    </div>

    <div className="share-strip"><span>Optional external distribution</span><code>{publicUrl}</code><button onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy</button></div>
    <div className="integration-box">
      <b>Conversion API</b>
      {apiKey ? <code>{apiKey}</code> : <p className="fineprint">Prefix {integrationPrefix || "fc_live_"}… Generate a key here. It is shown once.</p>}
      <p className="fineprint">POST /api/v1/conversions with Authorization: Bearer &lt;key&gt;. Reporting a conversion does not pay it — you still approve.</p>
      <button className="tiny-button" onClick={rotateKey}>{apiKey ? "Rotate key" : "Generate API key"}</button>
    </div>
    {message && <div className={message.startsWith("Checkout was cancelled") ? "warning" : "notice"}>{message}</div>}

    <section className="table-card"><div className="table-head"><h2>Referrers</h2><span>{referrals.length} total</span></div><div className="table-scroll"><table><thead><tr><th>Referrer</th><th>Clicks</th><th>Approved</th><th>Earned</th><th>Payout ready</th><th></th></tr></thead><tbody>{referrals.length ? referrals.map((referral) => <tr key={referral.id}><td>@{referral.x_handle}</td><td>{referral.clicks}</td><td>{referral.approved_conversions}</td><td>{money(referral.earned_cents)}</td><td>{referral.payouts_enabled ? "Yes" : "No"}</td><td><button className="tiny-button" onClick={() => approve(referral.id)}>Approve customer</button></td></tr>) : <tr><td colSpan={6}>No one has claimed this mission yet. Network matches are active above.</td></tr>}</tbody></table></div></section>

    <section className="table-card"><div className="table-head"><h2>Conversions & payouts</h2><span>{conversions.length}</span></div><div className="table-scroll"><table><thead><tr><th>Referrer</th><th>Customer ref</th><th>Reward</th><th>Status</th><th></th></tr></thead><tbody>{conversions.length ? conversions.map((conversion) => {
      const heldUntil = conversion.payout_available_at && Date.parse(conversion.payout_available_at) > Date.now() ? new Date(conversion.payout_available_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
      return <tr key={conversion.id}><td>@{conversion.x_handle}</td><td>{conversion.customer_reference}</td><td>{money(conversion.reward_cents)}</td><td><span className={`status-pill ${conversion.payout_status === "paid" ? "status-paid" : ""}`}>{heldUntil ? `held until ${heldUntil}` : conversion.payout_status}</span></td><td>{bounty.payout_mode === "stripe" && conversion.payout_status !== "paid" && !heldUntil ? <button className="tiny-button" onClick={() => retry(conversion.id)}>Retry payout</button> : null}</td></tr>;
    }) : <tr><td colSpan={5}>No verified customer conversions yet.</td></tr>}</tbody></table></div></section>
    <p className="fineprint">Automatic payouts are not instant. After you approve a customer, FirstCustomer waits {payoutDelayDays} day{payoutDelayDays === 1 ? "" : "s"} before charging the card and transferring the reward. The success fee is charged in addition to the advertised reward.</p>
  </main>;
}
