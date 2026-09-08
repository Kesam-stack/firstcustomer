import Link from "next/link";
import BountyCard from "@/components/BountyCard";
import { listMarketplaceBounties, marketplaceStats } from "@/lib/db";
import { money } from "@/lib/format";
import { rankFunded } from "@/lib/market";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const categories = ["All", "Software", "Artificial Intelligence", "Fintech", "Consumer", "Marketplace", "Professional Services"];

export default async function Explore({ searchParams }: { searchParams: Promise<{ category?: string; sort?: string }> }) {
  const params = await searchParams;
  const category = categories.includes(params.category || "") ? params.category! : "All";
  const sort = ["reward", "new", "closing", "recommended"].includes(params.sort || "") ? params.sort as "recommended" | "reward" | "new" | "closing" : "reward";
  let rows = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  let stats = { campaigns: 0, open_reward_cents: "0", network_members: 0, highest_reward_cents: "0", click_count: 0 };
  try { [rows, stats] = await Promise.all([listMarketplaceBounties(100, category, sort), marketplaceStats()]); } catch {}

  return <main className="shell page">
    <div className="market-title">
      <div>
        <span className="eyebrow">Board</span>
        <h1>Highest funded bounty sits at #1. Hold it for $29.</h1>
        <p>{stats.campaigns} live · {money(Number(stats.open_reward_cents))} funded pool · {stats.click_count} clicks</p>
      </div>
      <div className="market-title-actions">
        <Link href="/network">Earn</Link>
        <Link className="button launch-button" href="/create">List bounty</Link>
      </div>
    </div>

    <div className="market-controls">
      <div>{categories.map((item) => <Link key={item} className={category === item ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(item)}&sort=${sort}`}>{item}</Link>)}</div>
      <div>
        <Link className={sort === "reward" ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(category)}&sort=reward`}>Rank</Link>
        <Link className={sort === "new" ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(category)}&sort=new`}>New</Link>
        <Link className={sort === "closing" ? "control active" : "control"} href={`/explore?category=${encodeURIComponent(category)}&sort=closing`}>Closing</Link>
      </div>
    </div>

    <div className="board-head">
      <span>#</span><span>Company</span><span>Customer</span><span>Reward</span><span>Pool</span><span>Left</span><span>Clicks</span><span>Claims</span><span>Status</span>
    </div>
    <div className="board-list">
      {rows.length
        ? rankFunded(rows).map(({ row, rank }) => <BountyCard bounty={row} rank={sort === "reward" || sort === "recommended" ? rank : undefined} key={row.id} />)
        : <div className="board-empty"><span>Empty lane</span><strong>No campaigns in this view.</strong><p>Change the filter or list the first bounty.</p><Link className="button launch-button" href="/create">List a bounty →</Link></div>}
    </div>
  </main>;
}
