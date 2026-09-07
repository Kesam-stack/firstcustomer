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
  try { [rows, stats] = await Promise.all([listMarketplaceBounties(100, category, sort), marketplaceStats()]); } catch {}

  return <main className="shell page">
    <div className="market-title">
      <div><span className="eyebrow">Market</span><h1>Customer acquisition, priced.</h1><p>{stats.campaigns} live campaigns · {money(Number(stats.open_reward_cents))} open rewards</p></div>
      <div className="market-title-actions"><Link href="/network">Earn from referrals</Link><Link className="button launch-button" href="/create">Launch campaign</Link></div>
    </div>

    <div className="market-controls">
      <div>{categories.map((item) => <Link key={item} className={category === item ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(item)}&sort=${sort}`}>{item}</Link>)}</div>
      <div><Link className={sort === "recommended" ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(category)}&sort=recommended`}>Best</Link><Link className={sort === "reward" ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(category)}&sort=reward`}>Reward</Link><Link className={sort === "new" ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(category)}&sort=new`}>New</Link><Link className={sort === "closing" ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(category)}&sort=closing`}>Closing</Link></div>
    </div>

    <div className="market-header"><span>Company</span><span>Mission</span><span>Reward</span><span>Remaining</span><span>Status</span><span></span></div>
    <div className="market-list">{rows.length ? rows.map((row) => <BountyCard bounty={row} key={row.id} />) : <div className="empty-state"><strong>No campaigns in this view.</strong><span>Change the filter or launch the first one.</span></div>}</div>
  </main>;
}
