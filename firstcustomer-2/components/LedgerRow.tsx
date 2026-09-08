import Link from "next/link";
import type { PublicPayout } from "@/lib/db";
import { absoluteTime, money, relativeTime, xProfileUrl } from "@/lib/format";

export default function LedgerRow({ payout, compact = false }: { payout: PublicPayout; compact?: boolean }) {
  const referrerX = xProfileUrl(payout.x_handle);
  const founder = xProfileUrl(payout.creator_x_handle);
  const profileHref = payout.identity_id ? `/people/${payout.identity_id}` : null;

  return <article className={`proof-row${compact ? " compact" : ""}`}>
    <time dateTime={payout.paid_at} title={absoluteTime(payout.paid_at)}>{relativeTime(payout.paid_at)}</time>
    <div className="proof-campaign">
      <Link href={`/b/${payout.slug}`}><strong>{payout.company_name}</strong></Link>
      <span>{payout.headline}</span>
    </div>
    <div className="proof-people">
      {founder ? <a href={founder} target="_blank" rel="noreferrer">@{payout.creator_x_handle}</a> : <span className="muted">Founder hidden</span>}
      <span className="proof-arrow">→</span>
      {profileHref
        ? <Link href={profileHref}>@{payout.x_handle}</Link>
        : referrerX
          ? <a href={referrerX} target="_blank" rel="noreferrer">@{payout.x_handle}</a>
          : <span>@{payout.x_handle}</span>}
      {payout.rainmaker && <b className="rainmaker">Rainmaker</b>}
    </div>
    {compact ? null : <div className="proof-links">
      <Link className="proof-post" href={`/p/${payout.id}`}>Receipt</Link>
      {payout.source_post_url && <a className="proof-post" href={payout.source_post_url} target="_blank" rel="noreferrer">X post</a>}
    </div>}
    <strong><Link href={`/p/${payout.id}`}>{money(payout.reward_cents)}</Link></strong>
  </article>;
}
