"use client";

import { FormEvent, useState } from "react";

export default function ReferralBox({ slug, companyName }: { slug: string; companyName: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/bounties/${encodeURIComponent(slug)}/referrals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(fd.entries())) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create link");
      setUrl(data.shareUrl);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  async function copy() { await navigator.clipboard.writeText(url); }

  if (url) return (
    <div className="referral-result">
      <span>YOUR REFERRAL LINK</span>
      <code>{url}</code>
      <div className="two-actions"><button className="button dark" type="button" onClick={copy}>Copy link</button><a className="button ghost" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(`I'm helping ${companyName} find customers. If you need what they sell, use my link → ${url}`)}`}>Post on X</a></div>
    </div>
  );

  return (
    <form className="referral-box" onSubmit={create}>
      <h3>Earn the referral reward</h3>
      <p>Claim a unique link. The founder verifies qualifying customers and pays successful referrers directly.</p>
      <div className="two-col"><label>X handle<input name="xHandle" required placeholder="@yourhandle" /></label><label>Email <span>(optional)</span><input name="contactEmail" type="email" placeholder="you@email.com" /></label></div>
      {error && <div className="error">{error}</div>}
      <button className="button primary full" disabled={loading}>{loading ? "Creating…" : "Get my referral link →"}</button>
    </form>
  );
}
