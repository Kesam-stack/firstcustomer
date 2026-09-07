# FirstCustomer

FirstCustomer is a performance-based customer acquisition marketplace. Companies publish clear referral rewards; people claim tracked links; companies verify qualifying conversions; eligible referrers can be paid through Stripe Connect when automatic payouts are enabled.

## Revenue model

- $9 campaign launch fee.
- Automatic-payout campaigns: 10% platform success fee on approved conversions, charged in addition to the advertised referral reward.
- Future optional placement/featured-campaign revenue can be added without changing the core acquisition loop.

## Production architecture

- Next.js App Router
- PostgreSQL
- Stripe Checkout for campaign launch/payment-method setup
- Stripe Connect Express for referrer payout onboarding
- Stripe PaymentIntents + Transfers for automatic reward settlement
- Railway deployment and managed PostgreSQL

## Core flows

### Company

1. Post company information, conversion criteria, reward, goal, and payout mode.
2. Pay the $9 launch fee.
3. Campaign becomes visible in `/explore`.
4. Share the public campaign URL.
5. Track referrers, clicks, approved customers, earned rewards, and payout states.
6. Approve conversions manually or report them via the Conversion API.

### Referrer

1. Browse live campaigns.
2. Claim a referral link with X handle + email.
3. Share the link.
4. Track clicks, approvals, earned rewards, and paid rewards on the private referrer dashboard.
5. Complete Stripe Express onboarding for automatic-payout campaigns.

### Customer attribution

`/r/:code` records the click and redirects to the company's product with `fc_ref` and UTM parameters. See `API.md` for server-side conversion reporting.

## Environment

Required for production:

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://your-domain.example
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Never enable demo billing in production.

## Database

Run:

```bash
npm run db:migrate
```

The migration is idempotent and can be used as a Railway pre-deploy command once the upgraded source is deployed.

## Stripe webhook

Endpoint:

`POST /api/stripe/webhook`

Required event:

- `checkout.session.completed`

## Safety / trust boundaries

- Demo/example companies are explicitly labeled and are never rendered as live advertisers.
- Campaign terms are public before a user claims a referral.
- Conversion approval is idempotent by customer reference.
- Automatic reward state is explicit: pending, processing, paid, failed, or not configured.
- FirstCustomer does not mark a reward as paid unless a Stripe transfer succeeds.
- Campaign moderation, fraud controls, identity/business verification, tax reporting, payout reversals, dispute handling, and counsel-reviewed terms are still required before large-scale production use.

## Deployment

Railway service root directory is `/firstcustomer-2` in the current GitHub layout. Add `npm run db:migrate` as the pre-deploy command after this source version is pushed.
