"use client";

import { FormEvent, useState } from "react";

export default function AdminListForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setMessage(data.error || "Could not publish");
    const extra = data.ownerKey ? ` Dashboard: /manage/${data.id}?key=${data.ownerKey}` : "";
    setMessage(`Live at /b/${data.slug}.${extra}`);
  }

  return <form className="launch-console" onSubmit={submit}>
    <div className="form-section-head"><span>00</span><div><h2>List without the $9 fee</h2><p>Operator listings go live immediately. Launch fee is waived. They can still take #1 if payouts are automatic.</p></div></div>
    <div className="two-col">
      <label>Company<input name="companyName" required defaultValue="PassID" /></label>
      <label>Slug<input name="slug" defaultValue="passid" /></label>
    </div>
    <div className="two-col">
      <label>Product URL<input name="productUrl" required defaultValue="https://passid.io" /></label>
      <label>Logo URL<input name="companyLogoUrl" defaultValue="https://passid.io/assets/icon.png" /></label>
    </div>
    <div className="two-col">
      <label>Work email<input name="creatorEmail" required type="email" defaultValue="hello@passid.io" /></label>
      <label>X handle<input name="creatorXHandle" required defaultValue="@PassID_" /></label>
    </div>
    <label>Description<textarea name="companyDescription" required rows={2} defaultValue="The financial credential layer for the global economy. Turn consented financial history into signed, reusable credentials institutions can verify without raw bank data." /></label>
    <label>Mission<input name="headline" required defaultValue="Bring PassID a new institution to pilot" /></label>
    <label>What counts<textarea name="desiredAction" required rows={3} defaultValue="A new bank, fintech, lender, insurer, landlord, or platform books a sandbox verification or creates an institution workspace, using a work email, and was not already a PassID customer." /></label>
    <label>Terms<textarea name="referralTerms" required rows={2} defaultValue="New institutions only. No self-referrals. PassID verifies the introduction within 7 days. The reward pays when the institution starts a workspace or completes a sandbox verification." /></label>
    <div className="two-col">
      <label>Reward<input name="rewardDollars" required type="number" defaultValue="50" /></label>
      <label>Customers<input name="goalCount" required type="number" defaultValue="10" /></label>
    </div>
    <input type="hidden" name="category" value="Fintech" />
    {message && <div className="notice">{message}</div>}
    <button className="button launch-button" disabled={loading}>{loading ? "Publishing…" : "Publish complimentary listing →"}</button>
  </form>;
}
