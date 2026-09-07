import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero shell">
        <div className="eyebrow">CUSTOMER ACQUISITION, WITH A PRICE ON IT</div>
        <h1>Need customers?<br/><em>Put a bounty on them.</em></h1>
        <p className="hero-copy">Turn your launch into a public referral bounty. People share your product because there is finally something in it for them.</p>
        <div className="hero-actions">
          <Link href="/create" className="button primary">Launch a bounty — $9</Link>
          <a href="#how" className="button ghost">See how it works</a>
        </div>
        <div className="proof-line"><span>Founder pays referrers directly</span><span>•</span><span>No escrow</span><span>•</span><span>Live in minutes</span></div>
      </section>

      <section className="demo-wrap shell">
        <div className="demo-card">
          <div className="demo-top"><span className="live-dot" /> LIVE BOUNTY <span className="demo-code">#01</span></div>
          <h2>Help Acme get its first 10 paying teams.</h2>
          <p>Bring a team that starts a paid plan.</p>
          <div className="reward-grid">
            <div><span>REWARD</span><strong>$50</strong><small>per customer</small></div>
            <div><span>PROGRESS</span><strong>3 / 10</strong><small>approved</small></div>
            <div><span>BOUNTY</span><strong>$500</strong><small>total opportunity</small></div>
          </div>
          <div className="progress"><div style={{width:"30%"}} /></div>
          <button className="button dark" type="button">Get my referral link →</button>
        </div>
      </section>

      <section id="how" className="section shell">
        <div className="section-kicker">HOW IT WORKS</div>
        <div className="steps">
          <article><b>01</b><h3>Set the bounty</h3><p>Define the customer action, reward per conversion, and how many customers you want.</p></article>
          <article><b>02</b><h3>Post it on X</h3><p>People claim personal referral links and distribute your offer because successful referrals pay them.</p></article>
          <article><b>03</b><h3>Verify + pay</h3><p>You confirm valid customers in the founder dashboard and pay referrers directly.</p></article>
        </div>
      </section>

      <section className="cta shell">
        <p>Founders need customers. Everyone else needs money.</p>
        <h2>Connect the incentives.</h2>
        <Link href="/create" className="button primary">Launch yours for $9 →</Link>
      </section>
    </main>
  );
}
