"use client";

import { FormEvent, useState } from "react";

export default function ReferralBox({ slug, companyName, payoutMode }: { slug: string; companyName: string; payoutMode: string }) {
  const [url, setUrl] = useState("");
  const [manage, setManage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/bounties/${encodeURIComponent(slug)}/referrals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not create referral");
      setUrl(d.shareUrl);
      setManage(d.manageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (url) {
    return <div className="referral-result">
      <b>Your referral is ready</b>
      <code>{url}</code>
      <div className="two-actions">
        <button className="button dark" onClick={() => navigator.clipboard.writeText(url)}>Copy link</button>
        <a className="button secondary" href={manage}>Earnings & payouts</a>
        <a className="button secondary" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(`${companyName} is paying for verified customer referrals. ${url}`)}`}>Share on X</a>
      </div>
    </div>;
  }

  return <form className="referral-box" onSubmit={create}>
    <h3>Claim this bounty</h3>
    <p>{payoutMode === "stripe" ? "Use a real email — it is used to set up your payout account." : "The company pays approved rewards directly."}</p>
    <div className="two-col">
      <label>X handle<input name="xHandle" required placeholder="@yourhandle" /></label>
      <label>Email<input name="contactEmail" required type="email" placeholder="you@email.com" /></label>
    </div>
    <label>X post URL <span>optional — shown on the public ledger after payout</span><input name="sourcePostUrl" placeholder="https://x.com/you/status/123" /></label>
    {error && <div className="error">{error}</div>}
    <button className="button launch-button full" disabled={loading}>{loading ? "Creating…" : "Get referral link →"}</button>
  </form>;
}
