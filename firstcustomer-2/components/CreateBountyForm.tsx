"use client";

import { FormEvent, useMemo, useState } from "react";

export default function CreateBountyForm({ launchFeeDollars, platformFeePercent, minimumRewardDollars }: { launchFeeDollars: number; platformFeePercent: number; minimumRewardDollars: number }) {
  const [reward, setReward] = useState(Math.max(75, minimumRewardDollars));
  const [goal, setGoal] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => Math.max(0, reward) * Math.max(0, goal), [reward, goal]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/bounties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create campaign");
      location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return <form className="form-card" onSubmit={submit}>
    <div className="network-included"><div className="network-icon">N</div><div><b>FirstCustomer Network distribution included</b><p>After payment, your campaign is published to Explore and automatically matched to network members. Posting on X is optional.</p></div></div>
    <div className="two-col"><label>Company name<input name="companyName" required maxLength={80} placeholder="Acme" /></label><label>Category<select name="category" defaultValue="Software"><option>Software</option><option>Artificial Intelligence</option><option>Fintech</option><option>Consumer</option><option>Marketplace</option><option>Professional Services</option><option>Other</option></select></label></div>
    <label>Company website<input name="productUrl" required placeholder="https://acme.com" /></label>
    <label>Logo URL <span>(optional)</span><input name="companyLogoUrl" placeholder="https://acme.com/logo.png" /></label>
    <label>Company description<textarea name="companyDescription" required maxLength={280} rows={3} placeholder="One sentence that makes a referrer understand what you sell and who it is for." /></label>
    <label>Work email<input name="creatorEmail" required type="email" placeholder="you@company.com" /></label>
    <label>Campaign mission<input name="headline" required maxLength={140} placeholder="Refer a new paid Team customer" /></label>
    <label>Exactly what counts as a conversion?<textarea name="desiredAction" required maxLength={400} rows={4} placeholder="A new company starts a paid Team plan, is not an existing customer, and remains active for at least 7 days." /></label>
    <label>Reward terms <span>(shown publicly)</span><textarea name="referralTerms" required maxLength={600} rows={3} placeholder="New customers only. Self-referrals excluded. Company has 7 days to verify a submitted conversion." /></label>
    <div className="two-col"><label>Reward per customer ($)<input name="rewardDollars" required min={minimumRewardDollars} max="100000" type="number" value={reward} onChange={(e) => setReward(Number(e.target.value))} /></label><label>Customers wanted<input name="goalCount" required min="1" max="10000" type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></label></div>
    <label>Payout method<select name="payoutMode" defaultValue="stripe"><option value="stripe">Automatic via Stripe Connect (recommended)</option><option value="manual">Company pays referrers manually</option></select></label>
    <div className="summary-box"><span>Advertised customer-acquisition budget</span><strong>${total.toLocaleString()}</strong><small>Launch fee: ${launchFeeDollars.toLocaleString()}. Automatic payouts charge the company the advertised reward plus a {platformFeePercent}% FirstCustomer success fee only after an approved conversion. Stripe processing costs are separate.</small></div>
    {error && <div className="error">{error}</div>}
    <button className="button primary full" disabled={loading}>{loading ? "Opening checkout…" : `Launch into the network — $${launchFeeDollars} →`}</button>
    <p className="fineprint">Campaigns must describe legitimate customer acquisition. No self-referrals, misleading claims, illegal activity, regulated inducements, or prohibited offers.</p>
  </form>;
}
