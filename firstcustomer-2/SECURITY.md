# Security notes

FirstCustomer is an early marketplace. Automatic payouts move real money.

## What the product does

- Charges a launch fee through Stripe Checkout.
- For automatic-payout campaigns, charges the company's saved card for reward + platform fee, then transfers the reward via Stripe Connect.
- Records a public ledger row only after the transfer succeeds.
- Uses hashed secret URLs for founder, referrer, and network dashboards.

## Current controls

- Owner/referrer/network secrets are stored as SHA-256 hashes and compared with a constant-time check.
- Conversion customer references are unique per campaign.
- Automatic payouts use Stripe idempotency keys so a retry cannot create a second charge for the same conversion.
- Rank is limited to payment-verified automatic-payout campaigns.
- Advertised reward, goal, and pool are capped.
- Self-referrals by founder email are rejected.
- Preview bots do not increment public click counts.
- Mutation endpoints have basic per-IP rate limits.
- Admin is a password session at `/admin` (`FC_ADMIN_PASSWORD` + `FC_ADMIN_SECRET`). It is not linked from the public site.

## Still required before scale

1. Replace secret URLs with authenticated accounts and short-lived sessions.
2. Add a durable rate limiter (Redis) and bot protection.
3. Verify X handles and company identity.
4. Add campaign moderation and prohibited-category blocking.
5. Add refund/reversal handling when a chargeback follows a transfer.
6. Encrypt or minimize PII and define retention/deletion.
7. Have counsel review payments, tax reporting, advertising, and privacy.
8. Subscribe the Stripe webhook to `checkout.session.completed` and `account.updated`.
