"use client";

import { FormEvent, useMemo, useState } from "react";

export default function CreateBountyForm({
  launchFeeDollars,
  platformFeePercent,
  minimumRewardDollars,
  maximumRewardDollars,
  maximumGoalCount,
  maximumPoolDollars,
  initialProductUrl = "",
  initialReward,
  initialGoal,
}: {
  launchFeeDollars: number;
  platformFeePercent: number;
  minimumRewardDollars: number;
  maximumRewardDollars: number;
  maximumGoalCount: number;
  maximumPoolDollars: number;
  initialProductUrl?: string;
  initialReward?: number;
  initialGoal?: number;
}) {
  const [reward, setReward] = useState(Math.min(maximumRewardDollars, initialReward || Math.max(50, minimumRewardDollars)));
  const [goal, setGoal] = useState(Math.min(maximumGoalCount, initialGoal || 10));
  const [payoutMode, setPayoutMode] = useState("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => Math.max(0, reward) * Math.max(0, goal), [reward, goal]);
  const poolTooBig = total > maximumPoolDollars;

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

  return <form className="launch-console" onSubmit={submit}>
    <section>
      <div className="form-section-head"><span>01</span><div><h2>Company</h2><p>Enough context for someone to decide whether they can sell it.</p></div></div>
      <div className="two-col">
        <label>Company name<input name="companyName" required maxLength={80} placeholder="Acme" /></label>
        <label>Category<select name="category" defaultValue="Software"><option>Software</option><option>Artificial Intelligence</option><option>Fintech</option><option>Consumer</option><option>Marketplace</option><option>Professional Services</option><option>Other</option></select></label>
      </div>
      <label>Product URL<input name="productUrl" required defaultValue={initialProductUrl} placeholder="https://acme.com" /></label>
      <label>Company description<textarea name="companyDescription" required maxLength={280} rows={3} placeholder="What do you sell, and to whom?" /></label>
      <div className="two-col"><label>Work email<input name="creatorEmail" required type="email" placeholder="you@company.com" /></label><label>Your X handle<input name="creatorXHandle" required placeholder="@you" /></label></div>
      <label>Logo URL <span>optional</span><input name="companyLogoUrl" placeholder="https://acme.com/logo.png" /></label>
    </section>

    <section>
      <div className="form-section-head"><span>02</span><div><h2>Outcome</h2><p>Write the acceptance test before anyone starts referring.</p></div></div>
      <label>Public mission<input name="headline" required maxLength={140} placeholder="Bring us a new paid Team customer" /></label>
      <label>Exactly what counts?<textarea name="desiredAction" required maxLength={400} rows={4} placeholder="A new company starts a paid Team plan, was not an existing customer, and stays active for 7 days." /></label>
      <label>Reward terms<textarea name="referralTerms" required maxLength={600} rows={3} placeholder="New customers only. No self-referrals. Company verifies within 7 days." /></label>
    </section>

    <section>
      <div className="form-section-head"><span>03</span><div><h2>Economics</h2><p>Price the outcome, not the traffic.</p></div></div>
      <div className="economics-grid">
        <label>Reward per customer<div className="money-input"><span>$</span><input name="rewardDollars" required min={minimumRewardDollars} max={maximumRewardDollars} type="number" value={reward} onChange={(e) => setReward(Number(e.target.value))} /></div></label>
        <label>Customers wanted<input name="goalCount" required min="1" max={maximumGoalCount} type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></label>
        <label>Payout<select name="payoutMode" value={payoutMode} onChange={(e) => setPayoutMode(e.target.value)}><option value="stripe">Automatic via Stripe Connect</option><option value="manual">Company pays manually</option></select></label>
      </div>
      <div className="budget-line"><span>Maximum advertised reward pool</span><strong>{total.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</strong></div>
      {poolTooBig && <div className="error">Pool cannot exceed {maximumPoolDollars.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}. Lower the reward or customer count.</div>}
      {payoutMode === "manual" && <div className="warning">Manual listings appear on the board but cannot take #1. Rank is reserved for automatic-payout campaigns with a card on file.</div>}
      <p className="form-note">Launch fee {launchFeeDollars.toLocaleString("en-US", { style: "currency", currency: "USD" })}. Automatic payouts charge the company’s saved card for the reward plus a {platformFeePercent}% FirstCustomer fee, then transfer the reward to the referrer. Stripe processing is separate. Max ${maximumRewardDollars.toLocaleString("en-US")} per customer.</p>
    </section>

    <section className="launch-final">
      <div><span>04</span><h2>Take a rank</h2><p>After checkout the bounty goes live. Only automatic payouts compete for #1. FirstCustomer also routes it to matching network members.</p></div>
      {error && <div className="error">{error}</div>}
      <button className="button launch-button wide" disabled={loading || poolTooBig}>{loading ? "Opening checkout…" : "Pay " + launchFeeDollars.toLocaleString("en-US", { style: "currency", currency: "USD" }) + " and launch →"}</button>
      <small>No fake traffic. No fabricated payouts. You stay responsible for approving only customers that meet your published criteria.</small>
    </section>
  </form>;
}
