"use client";

import { FormEvent, useMemo, useState } from "react";

export default function CreateBountyForm() {
  const [reward, setReward] = useState(50);
  const [goal, setGoal] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => Math.max(0, reward) * Math.max(0, goal), [reward, goal]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/bounties", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create bounty");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <label>Company / product<input name="companyName" required maxLength={80} placeholder="Acme" /></label>
      <label>Product URL<input name="productUrl" required placeholder="https://acme.com" inputMode="url" /></label>
      <label>Your email<input name="creatorEmail" required type="email" placeholder="you@company.com" /></label>
      <label>Bounty headline<input name="headline" required maxLength={140} placeholder="Help Acme get its first 10 paying teams." /></label>
      <label>What counts as a customer?<textarea name="desiredAction" required maxLength={300} rows={3} placeholder="A new company starts a paid Pro plan and remains active for 7 days." /></label>
      <div className="two-col">
        <label>Reward per customer ($)<input name="rewardDollars" required min="1" max="100000" type="number" value={reward} onChange={e => setReward(Number(e.target.value))} /></label>
        <label>Customers wanted<input name="goalCount" required min="1" max="10000" type="number" value={goal} onChange={e => setGoal(Number(e.target.value))} /></label>
      </div>
      <div className="summary-box"><span>Public bounty opportunity</span><strong>${total.toLocaleString()}</strong><small>This is not charged by FirstCustomer. You pay approved referrers directly.</small></div>
      {error && <div className="error">{error}</div>}
      <button className="button primary full" disabled={loading}>{loading ? "Creating…" : "Launch bounty — $9 →"}</button>
      <p className="fineprint">By launching, you agree to the Terms. Do not offer rewards for illegal, deceptive, regulated, or prohibited activity.</p>
    </form>
  );
}
