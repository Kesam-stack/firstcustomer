export default function Privacy() {
  return <main className="shell narrow page-pad legal">
    <h1>Privacy</h1>
    <p>This notice describes what FirstCustomer stores today. It is not a complete GDPR/CCPA policy. Add a counsel-reviewed notice before collecting data at scale.</p>
    <p>We store company names, product URLs, work emails, campaign terms, referrer X handles and emails, click timestamps, user-agent strings, conversion references, Stripe customer/account identifiers, and payout records needed to run the board, attribution, and settlement.</p>
    <p>Founder and referrer dashboards are accessed through private high-entropy links. Anyone with a link can act as that user. Do not share those URLs.</p>
    <p>We use first-party product analytics to understand page traffic and conversion funnels. Public-page analytics store HMAC-hashed anonymous browser and session identifiers, page paths, coarse device type, referral host, and campaign UTM parameters. We do not store raw IP addresses or private URL query strings in this analytics table.</p>
    <p>We do not sell personal data. Do not submit government IDs, health information, or other sensitive personal data in campaign fields.</p>
    <p>To request deletion of an account or campaign record, email <a href="mailto:hello@firstcustomer.xyz">hello@firstcustomer.xyz</a>. Production should add a retention schedule, processor list, and jurisdiction-specific rights before large-scale use.</p>
  </main>;
}
