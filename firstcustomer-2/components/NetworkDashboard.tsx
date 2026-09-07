"use client";

import { useState } from "react";
import type { CampaignMatch, NetworkMember } from "@/lib/types";
import { money } from "@/lib/format";

export default function NetworkDashboard({ member, matches, privateKey }: { member: NetworkMember; matches: CampaignMatch[]; privateKey: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ matchId: string; shareUrl: string; manageUrl: string } | null>(null);
  const open = matches.filter((m) => m.match_status === "offered");
  const claimed = matches.filter((m) => m.match_status === "claimed");

  async function claim(matchId: string) {
    setBusy(matchId);
    const response = await fetch(`/api/network/${member.id}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-network-key": privateKey },
      body: JSON.stringify({ matchId }),
    });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) return alert(data.error || "Could not claim mission");
    setResult({ matchId, shareUrl: data.shareUrl, manageUrl: data.manageUrl });
  }

  return <main className="shell page-pad">
    <div className="dashboard-head">
      <div><span className="section-kicker">FIRSTCUSTOMER NETWORK</span><h1>{member.display_name}</h1><p className="muted">Your private mission feed. Companies enter once; FirstCustomer routes the strongest opportunities to you.</p></div>
      <a className="button secondary" href="/explore">Browse all campaigns</a>
    </div>

    <div className="stats">
      <div><span>Matched</span><strong>{matches.length}</strong></div>
      <div><span>Ready to claim</span><strong>{open.length}</strong></div>
      <div><span>Claimed</span><strong>{claimed.length}</strong></div>
      <div><span>Alerts</span><strong>{member.email_alerts ? "On" : "Off"}</strong></div>
    </div>

    {result && <div className="network-result">
      <div><span>MISSION CLAIMED</span><h3>Your tracked link is ready.</h3></div>
      <code>{result.shareUrl}</code>
      <div className="two-actions"><button className="button dark" onClick={() => navigator.clipboard.writeText(result.shareUrl)}>Copy referral link</button><a className="button secondary" href={result.manageUrl}>Earnings dashboard</a><a className="button secondary" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(`Worth checking out: ${result.shareUrl}`)}`}>Share on X</a></div>
    </div>}

    <section className="network-feed">
      <div className="section-head"><div><span>YOUR MISSIONS</span><h2>Best opportunities for you</h2></div><small>Ranked by fit, payment trust, reward and freshness.</small></div>
      {matches.length ? <div className="mission-list">{matches.map((match) => {
        const left = Math.max(0, match.goal_count - match.approved_count);
        return <article className="mission-row" key={match.match_id}>
          <div className="mission-company"><div className="company-mark">{match.company_logo_url ? <img src={match.company_logo_url} alt="" /> : match.company_name[0]}</div><div><strong>{match.company_name}</strong><span>{match.category} · {match.payment_verified ? "Payment verified" : "Payment pending"}</span></div></div>
          <div className="mission-main"><span className="match-reason">{match.match_reason || "Network match"} · score {match.match_score}</span><h3>{match.headline}</h3><p>{match.desired_action}</p></div>
          <div className="mission-reward"><strong>{money(match.reward_cents)}</strong><span>per approved customer</span><small>{left} slots remaining</small></div>
          <div className="mission-action">{match.match_status === "claimed" ? <span className="claimed-pill">Claimed</span> : <button className="button primary" disabled={busy === match.match_id} onClick={() => claim(match.match_id)}>{busy === match.match_id ? "Claiming…" : "Claim mission"}</button>}<a href={`/b/${match.slug}`}>View terms →</a></div>
        </article>;
      })}</div> : <div className="empty-market"><h3>No mission matches yet.</h3><p>Your dashboard is active. New company campaigns that fit your categories will be routed here automatically.</p></div>}
    </section>
    <p className="fineprint">Keep this dashboard URL private. It acts as your current network access credential.</p>
  </main>;
}
