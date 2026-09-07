import JoinNetworkForm from "@/components/JoinNetworkForm";
import { marketplaceStats } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  let stats = { campaigns: 0, open_reward_cents: "0", network_members: 0 };
  try { stats = await marketplaceStats(); } catch {}
  return <main>
    <section className="network-hero shell">
      <div><span className="hero-pill">THE FIRSTCUSTOMER NETWORK</span><h1>Companies bring the budget.<br/><em>We bring the distribution.</em></h1><p>Join once. Tell us what you know and who you can reach. FirstCustomer routes paid customer-acquisition missions to you automatically — no need to wait for a founder to post on X.</p><div className="network-stats"><div><strong>{stats.campaigns}</strong><span>live campaigns</span></div><div><strong>{money(Number(stats.open_reward_cents))}</strong><span>open rewards</span></div><div><strong>{stats.network_members}</strong><span>network members</span></div></div></div>
      <div className="network-demo"><div className="network-signal">NEW MATCH</div><h3>$75 / customer</h3><strong>AI team subscription</strong><p>Matched because you selected Artificial Intelligence + X.</p><div className="match-score"><span>Fit</span><b>94</b></div><button className="button primary full" type="button">Claim mission</button><small>Illustrative example</small></div>
    </section>
    <section className="network-join shell"><div className="network-copy"><span>ONE PROFILE</span><h2>Your customer-acquisition inbox.</h2><div className="network-points"><article><b>01</b><div><h3>Set your edge</h3><p>Industries, channels, audience and direct-introduction reach.</p></div></article><article><b>02</b><div><h3>Get matched</h3><p>New campaigns are ranked for you by fit, reward, trust and freshness.</p></div></article><article><b>03</b><div><h3>Claim only what fits</h3><p>One click creates your tracked referral link and earnings dashboard.</p></div></article><article><b>04</b><div><h3>Earn on verified outcomes</h3><p>No vanity engagement. The company pays for customers that meet its published criteria.</p></div></article></div></div><div><JoinNetworkForm /></div></section>
  </main>;
}
