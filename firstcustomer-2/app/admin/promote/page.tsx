import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import {
  marketplaceStats,
  publicLedgerStats,
  listPublicPayouts,
  listMarketplaceBounties,
  listLeaderboard,
  adminAnalyticsOverview,
} from "@/lib/db";
import { money, tweetIntent } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { rankFunded } from "@/lib/market";
import PromoteConsole from "@/components/PromoteConsole";

export const dynamic = "force-dynamic";

type Block = { text: string; composeUrl?: string };
type Card = { id: string; title: string; note?: string; blocks: Block[] };

const post = (text: string): Block => ({ text, composeUrl: tweetIntent(text) });

export default async function PromotePage() {
  if (!await isAdmin()) redirect("/admin/login");

  const emptyStats = { campaigns: 0, open_reward_cents: "0", network_members: 0, active_recently: 0, highest_reward_cents: "0", click_count: 0 };
  const emptyLedger = { total_paid_cents: "0", payout_count: 0, companies_paid: 0 };

  let stats = emptyStats;
  let ledger = emptyLedger;
  let payouts = [] as Awaited<ReturnType<typeof listPublicPayouts>>;
  let bounties = [] as Awaited<ReturnType<typeof listMarketplaceBounties>>;
  let rainmakers = [] as Awaited<ReturnType<typeof listLeaderboard>>;
  let analytics = null as Awaited<ReturnType<typeof adminAnalyticsOverview>>;

  try {
    [stats, ledger, payouts, bounties, rainmakers, analytics] = await Promise.all([
      marketplaceStats(),
      publicLedgerStats(),
      listPublicPayouts(20),
      listMarketplaceBounties(100, "All", "reward"),
      listLeaderboard(5),
      adminAnalyticsOverview(),
    ]);
  } catch {}

  const pool = money(Number(stats.open_reward_cents));
  const paidTotal = money(Number(ledger.total_paid_cents));
  const rankedLive = rankFunded(bounties).filter((r) => r.rank).map((r) => r.row);
  const home = "firstcustomer.xyz";

  const cards: Card[] = [];

  // 1 — Pinned launch thread
  cards.push({
    id: "thread",
    title: "Pinned launch thread",
    note: "Post as a thread, pin it. Link only in the last tweet — a link in tweet 1 suppresses reach.",
    blocks: [
      { text: "1/ posted my startup on X months ago. 0 customers. not \"slow\" — zero.\n\nhere's the autopsy, and what I'm changing." },
      { text: "2/ FirstCustomer: put a cash bounty on your next customer.\n\nyou name the outcome — a signup, a paid plan, a booked demo — and the reward you'll pay for it. other people go bring you that customer. the link is tracked. the payout is recorded in public." },
      { text: "3/ pricing stayed boring on purpose:\n$9 to launch\n10% only when a customer is approved\nno monthly" },
      { text: "4/ the mistake: I dropped a link to an empty marketplace and waited.\n\nnobody wants to be first to fund a market with no activity. supply and demand each wait on the other." },
      { text: `5/ so I'm doing it by hand. 5 founders: you fund a real reward, I cover the $9, waive the fee, and personally bring the first people to work your bounty.\n\nneed early customers? reply or DM → ${home}` },
    ],
  });

  // 2 — Live inventory
  if (rankedLive.length) {
    const lines = rankedLive.slice(0, 3).map((b) => `• ${b.company_name} — ${money(b.reward_cents)} per customer`).join("\n");
    cards.push({
      id: "inventory",
      title: "Live inventory post",
      note: "Recurring format. Real numbers pulled from the board right now.",
      blocks: [post(`⚡ ${pool} in open customer bounties on FirstCustomer right now.\n\n${lines}\n\nfind one and earn it → ${home}`)],
    });
  } else {
    cards.push({
      id: "inventory",
      title: "Live inventory post",
      note: "The board has no funded live missions yet — this is the honest empty-board version.",
      blocks: [post(`the FirstCustomer board is open and unclaimed.\n\nfirst company to fund a customer bounty takes #1. no seeded demand, no fake numbers.\n\n${home}`)],
    });
  }

  // 3 — Verified payout announcements
  if (payouts.length) {
    cards.push({
      id: "receipts",
      title: "Verified payout announcements",
      note: "One per cleared payout. The /p/ link unfurls as the receipt card. Post these as they happen.",
      blocks: payouts.map((p) => post(
        `✅ verified payout: ${money(p.reward_cents)} to @${p.x_handle} for a customer delivered to ${p.company_name}.\n\ncleared on Stripe. public receipt → ${siteUrl(`/p/${p.id}`)}`,
      )),
    });
  } else {
    cards.push({
      id: "receipts",
      title: "Verified payout announcements",
      note: "No cleared payouts yet. This transparency post is still worth posting.",
      blocks: [post(`the FirstCustomer ledger is still empty.\n\nit stays that way until a real Stripe transfer clears. no seeded rows, no fake proof. every payout will show up here → ${siteUrl("/ledger")}`)],
    });
  }

  // 4 — Weekly recap
  if (analytics) {
    cards.push({
      id: "recap",
      title: "Weekly recap",
      note: "Post once a week. Numbers are the trailing 7 days.",
      blocks: [post(
        `this week on FirstCustomer:\n\n${analytics.payouts_7d} verified payouts · ${money(Number(analytics.payout_cents_7d))} paid out\n${analytics.campaigns_created_7d} new bounties · ${analytics.approved_7d} customers approved\n${analytics.referral_clicks_7d} referral clicks\n\n${home}`,
      )],
    });
  }

  // 5 — Evergreen posts
  cards.push({
    id: "evergreen",
    title: "Evergreen posts",
    note: "Rotate angles. Space them out — one a day, not all at once.",
    blocks: [
      post(`founders need customers.\neveryone else needs a reason to send them one.\n\nso pay for the customer, not the click.\n\n$9 to put a bounty on your next one → ${home}`),
      post("three ways to get customers:\n\nrent attention → ads\nborrow attention → creators\nprice the outcome → post a bounty anyone can go earn\n\nthe first two bill you whether they work or not. the third mostly doesn't."),
      post(`how a customer bounty works:\n\n1. you post the exact outcome + the reward you'll pay\n2. someone claims a tracked link and goes to find that customer\n3. the customer converts, you verify it\n4. reward is paid, recorded publicly\n\n$9 to launch. 10% on approved conversions. no subscription. → ${home}`),
      post("experiment: I'll hand-build the first customer bounty for 5 founders this week.\n\nyou set the reward and what counts as a real customer. I wire up tracking and bring the first people to work it.\n\nbuilding something that needs early customers? reply with the link."),
    ],
  });

  // 6 — Outreach template (reply / DM — not a standalone post)
  cards.push({
    id: "outreach",
    title: "Outreach reply / DM template",
    note: "The channel that actually converts. Search the phrases below, reply to ~10/day.",
    blocks: [
      { text: "saw you just launched [product] — this is the exact moment I built for. you put a public cash bounty on your next customer so people have a real reason to push your launch. I'll set the first one up with you and bring the first few people to it. 10 min, no charge from me." },
      { text: "X search terms to work daily:\n\njust launched\nlooking for beta users\nneed our first customers\nroast my landing page\nbuilding in public" },
    ],
  });

  return <main className="shell page">
    <div className="page-heading">
      <span className="eyebrow">Promote</span>
      <h1>Content, from live data.</h1>
      <p>Copy-paste posts built from the real board and ledger. Nothing here is sent automatically.</p>
    </div>

    <div className="promote-state">
      <div><span>Live missions</span><strong>{stats.campaigns}</strong></div>
      <div><span>Funded pool</span><strong>{pool}</strong></div>
      <div><span>Network</span><strong>{stats.network_members}</strong></div>
      <div><span>Verified paid</span><strong>{paidTotal}</strong></div>
    </div>

    {rainmakers.length > 0 && <p className="fineprint">
      Top rainmakers: {rainmakers.map((r) => `@${r.x_handle} (${money(r.paid_cents)})`).join(" · ")}
    </p>}

    <PromoteConsole cards={cards} />
  </main>;
}
