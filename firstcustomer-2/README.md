# FirstCustomer

A small, monetizable X-native customer bounty MVP.

**Business model:** the founder pays FirstCustomer a **$9 launch fee** to publish a bounty. FirstCustomer does **not** hold or transmit the bounty pool. Founders verify eligible customer referrals and pay referrers directly.

## What is implemented

- Conversion-focused landing page
- Bounty creation form
- Stripe Checkout for the $9 launch fee
- Stripe webhook activation
- Public bounty pages with reward/progress/goal
- Unique referral links per X handle
- Referral click tracking with UTM + `fc_ref` parameters
- Founder dashboard protected by a private owner token
- Founder approval of referred customers
- Automatic progress updates and bounty closure at goal
- Postgres schema
- Demo seed
- Starter Terms + Privacy pages
- Mobile responsive UI

## Stack

- Next.js 16.3.4 App Router
- React 19.2
- PostgreSQL (`pg`)
- Stripe Node 22.6.1
- TypeScript

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create a Postgres database

Use local Postgres, Neon, Railway Postgres, Supabase Postgres, or another Postgres provider.

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

If your shell does not export `.env.local`, copy the connection string directly into the command or export it first.

### 3. Run in demo-billing mode

For UI/product testing, leave:

```env
ALLOW_DEMO_BILLING=true
```

and do **not** set a Stripe secret key. Demo billing is explicitly blocked when `NODE_ENV=production`.

```bash
npm run dev
```

Open http://localhost:3000

### 4. Seed a live-looking bounty

```bash
export DATABASE_URL='postgresql://...'
npm run db:seed
```

The seed prints both the public bounty URL and its private founder dashboard URL.

## Turn on real payments

Set:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the emitted `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart Next.js.

The app creates a one-time $9 Stripe Checkout Session. Successful Checkout activates the bounty through the webhook; the success page also verifies a paid Checkout Session as a recovery path.

## Production deployment

Recommended first deployment:

1. Create a managed Postgres database.
2. Run `db/schema.sql` against it.
3. Deploy to Vercel.
4. Set `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`.
5. **Do not set `ALLOW_DEMO_BILLING=true` in production.**
6. Create a Stripe webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed`.
7. Replace the starter legal pages with counsel-reviewed terms/privacy before public launch.
8. Add abuse/rate limiting before meaningful traffic.

## Critical MVP boundary

This version intentionally avoids collecting the promised referral bounty. The `$9` platform launch fee is the only money FirstCustomer receives.

That boundary makes the first version materially simpler operationally. Before FirstCustomer ever escrows, transfers, or automatically splits bounty funds, obtain appropriate payments/legal review and likely use a marketplace payout product such as Stripe Connect rather than improvising custody.

## Founder workflow

1. Founder creates bounty.
2. Founder pays $9.
3. Bounty becomes public.
4. Referrer enters X handle and receives a unique share link.
5. Visitor opens that link and clicks the product CTA.
6. FirstCustomer increments referral clicks and sends `fc_ref=CODE` plus UTM params to the founder's product.
7. Founder sees referrers in the private dashboard.
8. Founder verifies a real customer and clicks `+ approve customer`.
9. Dashboard records the conversion and calculates what the founder owes the referrer.
10. Founder pays that referrer directly.

## Before a serious public launch

Add these next:

- Magic-link founder authentication instead of URL owner tokens
- Rate limiting / bot protection on bounty + referral creation
- Email verification for referrers
- Founder webhook/API for automatic conversion verification
- Duplicate-customer / fraud checks
- Campaign moderation and prohibited-category enforcement
- Email notifications
- Payment receipts / billing portal
- Admin dashboard
- Conversion reversal flow
- Payout status tracking (without custody) or a properly designed marketplace payout system
- Observability, backups, and error monitoring
- Full test suite and end-to-end Stripe test mode coverage

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical app URL |
| `STRIPE_SECRET_KEY` | Real billing | Server-side Stripe key |
| `STRIPE_WEBHOOK_SECRET` | Real billing | Verifies Stripe events |
| `ALLOW_DEMO_BILLING` | Local only | Skips $9 charge outside production |

## License

Private MVP starter. Add the license you want before publishing the repository.
