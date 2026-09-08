import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BountyCard from "@/components/BountyCard";
import LedgerRow from "@/components/LedgerRow";
import { getPublicReferrerProfile, listMarketplaceBounties, listPublicPayoutsByIdentity } from "@/lib/db";
import { money } from "@/lib/format";
import { rankFunded } from "@/lib/market";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

async function loadProfile(id: string) {
  try { return await getPublicReferrerProfile(id); } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await loadProfile(id);
  if (!profile) return { title: "Referrer profile — FirstCustomer" };
  const title = `@${profile.x_handle} — ${money(profile.paid_cents)} paid on FirstCustomer`;
  const description = `${profile.paid_customers} verified payouts across ${profile.campaigns_paid} campaigns.`;
  return {
    title,
    description,
    alternates: { canonical: `/people/${profile.identity_id}` },
    openGraph: { title, description, type: "profile", url: siteUrl(`/people/${profile.identity_id}`) },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicReferrerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await loadProfile(id);
  if (!profile) notFound();

  let payouts = [] as Awaited<ReturnType<typeof listPublicPayoutsByIdentity>>;
  let missions = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  try {
    [payouts, missions] = await Promise.all([
      listPublicPayoutsByIdentity(profile.identity_id, 20),
      listMarketplaceBounties(4, "All", "reward"),
    ]);
  } catch {}

  return <main className="shell page">
    <section className="profile-hero">
      <div>
        <span className="eyebrow">{profile.rainmaker ? "Rainmaker" : "Public earnings profile"}</span>
        <h1>@{profile.x_handle}</h1>
        <p>Reputation here follows the canonical FirstCustomer payout identity—not a social handle. Changing handles does not reset the record.</p>
      </div>
      <div className="profile-actions">
        <Link className="button launch-button" href="/explore">Find a mission →</Link>
        <Link className="button secondary" href="/leaderboard">Leaderboard</Link>
      </div>
    </section>

    <div className="profile-stats">
      <div><span>Paid</span><strong>{money(profile.paid_cents)}</strong></div>
      <div><span>Verified payouts</span><strong>{profile.paid_customers}</strong></div>
      <div><span>Approved customers</span><strong>{profile.approved}</strong></div>
      <div><span>Campaigns paid</span><strong>{profile.campaigns_paid}</strong></div>
    </div>

    <section className="profile-section">
      <div className="section-bar"><div><span>Proof</span><h2>Payout history</h2></div><Link href="/ledger">Full ledger</Link></div>
      <div className="proof-table compact-profile">
        {payouts.length
          ? payouts.map((payout) => <LedgerRow payout={payout} key={payout.id} />)
          : <div className="empty-ledger">No paid rewards yet.</div>}
      </div>
    </section>

    <section className="profile-section">
      <div className="section-bar"><div><span>Next</span><h2>Open missions</h2></div><Link href="/explore">Full market</Link></div>
      <div className="board-head">
        <span>#</span><span>Company</span><span>Customer</span><span>Reward</span><span>Pool</span><span>Left</span><span>Clicks</span><span>Claims</span><span>Status</span>
      </div>
      <div className="board-list">
        {missions.length
          ? rankFunded(missions).map(({ row, rank }) => <BountyCard bounty={row} rank={rank} key={row.id} />)
          : <div className="empty-ledger">No funded missions are open right now.</div>}
      </div>
    </section>
  </main>;
}
