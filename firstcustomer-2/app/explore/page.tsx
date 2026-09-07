import Link from "next/link";
import BountyCard from "@/components/BountyCard";
import { listMarketplaceBounties, marketplaceStats } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";
const categories = ["All", "Software", "Artificial Intelligence", "Fintech", "Consumer", "Marketplace", "Professional Services"];

export default async function Explore({ searchParams }: { searchParams: Promise<{ category?: string; sort?: string }> }) {
  const params = await searchParams;
  const category = categories.includes(params.category || "") ? params.category! : "All";
  const sort = ["recommended", "reward", "new", "closing"].includes(params.sort || "") ? params.sort as "recommended" | "reward" | "new" | "closing" : "recommended";
  let rows = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  let stats = { campaigns: 0, open_reward_cents: "0", network_members: 0 };
  try { [rows, stats] = await Promise.all([listMarketplaceBounties(60, category, sort), marketplaceStats()]); } catch {}
  return <main className="shell page-pad"><div className="explore-head"><div className="page-heading"><span>LIVE CUSTOMER MISSIONS</span><h1>Find something worth distributing.</h1><p>Companies pay for verified customers. FirstCustomer makes the opportunities discoverable even when the founder never posts them externally.</p></div><Link className="button primary" href="/network">Join the network →</Link></div>
    <div className="market-statbar"><div><strong>{stats.campaigns}</strong><span>live missions</span></div><div><strong>{money(Number(stats.open_reward_cents))}</strong><span>open referral rewards</span></div><div><strong>{stats.network_members}</strong><span>network members</span></div></div>
    <div className="filters"><div>{categories.map((item) => <Link key={item} className={category === item ? "filter active" : "filter"} href={`/explore?category=${encodeURIComponent(item)}&sort=${sort}`}>{item}</Link>)}</div><div><Link className={sort === "recommended" ? "filter active" : "filter"} href={`/explore?category=${encodeURIComponent(category)}&sort=recommended`}>Recommended</Link><Link className={sort === "reward" ? "filter active" : "filter"} href={`/explore?category=${encodeURIComponent(category)}&sort=reward`}>Highest reward</Link><Link className={sort === "new" ? "filter active" : "filter"} href={`/explore?category=${encodeURIComponent(category)}&sort=new`}>Newest</Link><Link className={sort === "closing" ? "filter active" : "filter"} href={`/explore?category=${encodeURIComponent(category)}&sort=closing`}>Almost full</Link></div></div>
    {rows.length ? <div className="campaign-grid">{rows.map((row) => <BountyCard bounty={row} key={row.id} />)}</div> : <div className="empty-market"><h3>No live missions in this view yet.</h3><p>When a company launches, it appears here automatically and is routed to matching FirstCustomer Network members.</p></div>}
  </main>;
}
