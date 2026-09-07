export default function Terms() {
  return <main className="shell narrow page-pad legal">
    <h1>Terms</h1>
    <p>These terms describe how FirstCustomer works today. They are not a substitute for legal advice. If they conflict with a later counsel-reviewed version, the later version controls.</p>

    <h2>The product</h2>
    <p>FirstCustomer is a public board where companies list a cash reward for a defined customer outcome. People claim tracked referral links. Companies approve qualifying conversions. Rank on the board is determined by the advertised per-customer reward among campaigns that use automatic payouts.</p>

    <h2>Fees</h2>
    <p>Companies pay a launch fee to publish a campaign. For automatic-payout campaigns, FirstCustomer also charges a success fee on each approved conversion, in addition to the advertised reward. Stripe processing fees are separate.</p>

    <h2>Automatic payouts</h2>
    <p>If a company chooses automatic payouts, FirstCustomer charges the company’s saved payment method for the reward plus the success fee after the company approves a conversion, then transfers the reward to the referrer’s Stripe Connect account. FirstCustomer is the merchant of record for that charge. A conversion is shown as paid on the public ledger only after the Stripe transfer succeeds. Failed, pending, and manual rewards are not shown as paid.</p>

    <h2>Manual payouts</h2>
    <p>If a company chooses manual payouts, the company is solely responsible for paying eligible referrers. Manual campaigns may appear on the board but cannot take #1.</p>

    <h2>Company responsibility</h2>
    <p>Companies are responsible for defining eligibility, verifying conversions honestly, complying with advertising, referral, tax, employment, privacy, anti-spam, and consumer-protection rules, and keeping a valid payment method on file for automatic payouts.</p>

    <h2>Referrer responsibility</h2>
    <p>Referrers may not impersonate others, fabricate customers, spam, or refer themselves. X handles are self-reported and not independently verified by FirstCustomer.</p>

    <h2>Prohibited use</h2>
    <p>No illegal activity, fraud, impersonation, deceptive reviews, unlicensed financial solicitation, medical claims, gambling, weapons, controlled substances, harassment, or manipulation of board metrics.</p>

    <h2>Disputes and chargebacks</h2>
    <p>Eligibility disputes are between the company and the referrer. If an automatic charge is reversed after a transfer has been sent, FirstCustomer may recover the amount from the company and may suspend the campaign.</p>
  </main>;
}
