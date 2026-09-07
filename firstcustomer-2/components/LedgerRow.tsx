import Link from "next/link";
import type { PublicPayout } from "@/lib/db";
import { absoluteTime, money, relativeTime, xProfileUrl } from "@/lib/format";

export default function LedgerRow({ payout, compact = false }: { payout: PublicPayout; compact?: boolean }) {
  const referrer = xProfileUrl(payout.x_handle);
  const founder = xProfileUrl(payout.creator_x_handle);
  return <article className={`proof-row${compact ? " compact" : ""}`}>
    <time dateTime={payout.paid_at} title={absoluteTime(payout.paid_at)}>{relativeTime(payout.paid_at)}</time>
    <div className="proof-campaign">
      <Link href={`/b/${payout.slug}`}><strong>{payout.company_name}</strong></Link>
      <span>{payout.headline}</span>
    </div>
    <div className="proof-people">
      {founder ? <a href={founder} target="_blank" rel="noreferrer">@{payout.creator_x_handle}</a> : <span className="muted">Founder hidden</span>}
      <span className="proof-arrow">→</span>
      {referrer ? <a href={referrer} target="_blank" rel="noreferrer">@{payout.x_handle}</a> : <span>@{payout.x_handle}</span>}
      {payout.rainmaker && <b className="rainmaker">Rainmaker</b>}
    </div>
    {compact ? null : payout.source_post_url
      ? <a className="proof-post" href={payout.source_post_url} target="_blank" rel="noreferrer">X post</a>
      : <span className="muted">No post attached</span>}
    <strong>{money(payout.reward_cents)}</strong>
  </article>;
}
